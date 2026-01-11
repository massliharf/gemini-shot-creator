import { useState, useEffect, useCallback } from "react";
import { SceneWithStatus } from "@/types/pack";
import { SceneCard } from "./SceneCard";
import { FullscreenImageView } from "./FullscreenImageView";
import { RegenerateConfirmDialog } from "./RegenerateConfirmDialog";

interface ScenesGridProps {
  scenes: SceneWithStatus[];
  onGenerateScene: (sceneId: string | number) => void;
  onDownloadScene: (sceneId: string | number) => void;
}

const getSceneId = (scene: SceneWithStatus): string | number => {
  return scene.id ?? "0";
};

// Preload image and get its aspect ratio
const getImageAspectRatio = (url: string): Promise<number> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve(img.naturalWidth / img.naturalHeight);
    };
    img.onerror = () => resolve(1); // Default to 1:1 on error
    img.src = url;
  });
};

export const ScenesGrid = ({
  scenes,
  onGenerateScene,
  onDownloadScene,
}: ScenesGridProps) => {
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const [regenerateConfirm, setRegenerateConfirm] = useState<{
    open: boolean;
    sceneId: string | number | null;
  }>({ open: false, sceneId: null });
  const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});

  // Load aspect ratios for all images
  useEffect(() => {
    const loadAspectRatios = async () => {
      const newRatios: Record<string, number> = {};
      
      await Promise.all(
        scenes.map(async (scene) => {
          const id = String(getSceneId(scene));
          if (scene.status === "success" && scene.imageUrl && !aspectRatios[id]) {
            const ratio = await getImageAspectRatio(scene.imageUrl);
            newRatios[id] = ratio;
          }
        })
      );
      
      if (Object.keys(newRatios).length > 0) {
        setAspectRatios(prev => ({ ...prev, ...newRatios }));
      }
    };
    
    loadAspectRatios();
  }, [scenes]);

  const successfulScenes = scenes.filter((s) => s.status === "success" && s.imageUrl);
  const currentFullscreenScene = fullscreenIndex !== null ? successfulScenes[fullscreenIndex] : null;

  const handleOpenFullscreen = (scene: SceneWithStatus) => {
    const idx = successfulScenes.findIndex((s) => getSceneId(s) === getSceneId(scene));
    if (idx !== -1) setFullscreenIndex(idx);
  };

  const handlePrevious = () => {
    if (fullscreenIndex !== null && fullscreenIndex > 0) {
      setFullscreenIndex(fullscreenIndex - 1);
    }
  };

  const handleNext = () => {
    if (fullscreenIndex !== null && fullscreenIndex < successfulScenes.length - 1) {
      setFullscreenIndex(fullscreenIndex + 1);
    }
  };

  const handleRegenerateClick = (sceneId: string | number, hasExistingImage: boolean) => {
    if (hasExistingImage) {
      setRegenerateConfirm({ open: true, sceneId });
    } else {
      onGenerateScene(sceneId);
    }
  };

  const handleConfirmRegenerate = () => {
    if (regenerateConfirm.sceneId !== null) {
      onGenerateScene(regenerateConfirm.sceneId);
    }
    setRegenerateConfirm({ open: false, sceneId: null });
  };

  // Calculate target row height based on scene count
  const getTargetRows = () => {
    const count = scenes.length;
    if (count <= 2) return 1;
    if (count <= 6) return 2;
    if (count <= 12) return 3;
    return 4;
  };

  return (
    <>
      <RegenerateConfirmDialog
        open={regenerateConfirm.open}
        onOpenChange={(open) => setRegenerateConfirm({ ...regenerateConfirm, open })}
        onConfirm={handleConfirmRegenerate}
        sceneId={regenerateConfirm.sceneId ?? undefined}
      />

      {/* Google Photos style justified layout with real aspect ratios */}
      <div className="h-full w-full flex flex-wrap content-start gap-1 p-1 overflow-hidden">
        {scenes.map((scene, index) => {
          const sceneId = getSceneId(scene);
          const hasImage = scene.status === "success" && scene.imageUrl;
          const aspectRatio = aspectRatios[String(sceneId)] || 1;
          
          const targetRows = getTargetRows();
          // Row height = (container height - gaps) / rows
          const rowHeight = `calc((100% - ${(targetRows - 1) * 4}px) / ${targetRows})`;
          
          // Item width is proportional to aspect ratio
          // wider images (aspect > 1) get more width, taller images (aspect < 1) get less
          const baseWidth = hasImage ? aspectRatio : 1;

          return (
            <div 
              key={sceneId} 
              className="relative flex-shrink-0 flex-grow"
              style={{
                height: rowHeight,
                // Use aspect ratio to determine flex-basis
                flexBasis: hasImage ? `calc(${baseWidth} * ${rowHeight})` : `calc(1 * ${rowHeight})`,
                aspectRatio: hasImage ? aspectRatio : 1,
                minWidth: '100px',
                maxWidth: '100%',
              }}
            >
              <SceneCard
                scene={scene}
                index={index}
                onGenerate={() => handleRegenerateClick(sceneId, !!hasImage)}
                onDownload={() => onDownloadScene(sceneId)}
                onClick={() => hasImage && handleOpenFullscreen(scene)}
              />
            </div>
          );
        })}
      </div>

      {/* Fullscreen viewer */}
      <FullscreenImageView
        isOpen={fullscreenIndex !== null}
        onClose={() => setFullscreenIndex(null)}
        imageUrl={currentFullscreenScene?.imageUrl || null}
        sceneName={currentFullscreenScene?.title}
        sceneId={currentFullscreenScene ? getSceneId(currentFullscreenScene) : undefined}
        onDownload={() => currentFullscreenScene && onDownloadScene(getSceneId(currentFullscreenScene))}
        onRegenerate={() => {
          if (currentFullscreenScene) {
            handleRegenerateClick(getSceneId(currentFullscreenScene), true);
          }
        }}
        onPrevious={handlePrevious}
        onNext={handleNext}
        hasPrevious={fullscreenIndex !== null && fullscreenIndex > 0}
        hasNext={fullscreenIndex !== null && fullscreenIndex < successfulScenes.length - 1}
      />
    </>
  );
};
