import { useState } from "react";
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

  return (
    <>
      <RegenerateConfirmDialog
        open={regenerateConfirm.open}
        onOpenChange={(open) => setRegenerateConfirm({ ...regenerateConfirm, open })}
        onConfirm={handleConfirmRegenerate}
        sceneId={regenerateConfirm.sceneId ?? undefined}
      />

      {/* Google Photos style justified layout */}
      <div className="h-full w-full flex flex-wrap content-start gap-1 p-1 overflow-hidden">
        {scenes.map((scene, index) => {
          const sceneId = getSceneId(scene);
          const hasImage = scene.status === "success" && scene.imageUrl;
          
          // Calculate flex basis based on scene count for justified layout
          const count = scenes.length;
          const getItemStyle = (): React.CSSProperties => {
            // Target row height based on scene count
            let targetRows = 1;
            if (count <= 2) targetRows = 1;
            else if (count <= 6) targetRows = 2;
            else if (count <= 12) targetRows = 3;
            else targetRows = 4;
            
            const rowHeight = `calc((100% - ${(targetRows - 1) * 4}px) / ${targetRows})`;
            
            // Items per row based on aspect ratio (assume ~1.5 average)
            let itemsPerRow = Math.ceil(count / targetRows);
            itemsPerRow = Math.max(1, Math.min(itemsPerRow, 6));
            
            const itemWidth = `calc((100% - ${(itemsPerRow - 1) * 4}px) / ${itemsPerRow})`;
            
            return {
              flexBasis: itemWidth,
              flexGrow: 1,
              flexShrink: 1,
              height: rowHeight,
              maxWidth: count === 1 ? '100%' : `calc(100% / ${Math.max(1, Math.floor(count / targetRows) - 1)})`,
              minWidth: count <= 2 ? '45%' : count <= 4 ? '30%' : '20%',
            };
          };

          return (
            <div key={sceneId} style={getItemStyle()} className="relative">
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
