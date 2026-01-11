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

  // Calculate grid columns based on scene count to fit all on screen
  const getGridClass = () => {
    const count = scenes.length;
    if (count <= 1) return "grid-cols-1";
    if (count <= 2) return "grid-cols-2";
    if (count <= 4) return "grid-cols-2";
    if (count <= 6) return "grid-cols-3";
    if (count <= 9) return "grid-cols-3";
    if (count <= 12) return "grid-cols-4";
    if (count <= 16) return "grid-cols-4";
    return "grid-cols-5";
  };

  const getRowClass = () => {
    const count = scenes.length;
    if (count <= 1) return "grid-rows-1";
    if (count <= 2) return "grid-rows-1";
    if (count <= 4) return "grid-rows-2";
    if (count <= 6) return "grid-rows-2";
    if (count <= 9) return "grid-rows-3";
    if (count <= 12) return "grid-rows-3";
    if (count <= 16) return "grid-rows-4";
    return "grid-rows-4";
  };

  return (
    <>
      <RegenerateConfirmDialog
        open={regenerateConfirm.open}
        onOpenChange={(open) => setRegenerateConfirm({ ...regenerateConfirm, open })}
        onConfirm={handleConfirmRegenerate}
        sceneId={regenerateConfirm.sceneId ?? undefined}
      />

      <div className={`grid ${getGridClass()} ${getRowClass()} gap-1 p-1 h-full`}>
        {scenes.map((scene, index) => {
          const sceneId = getSceneId(scene);
          const hasImage = scene.status === "success" && scene.imageUrl;

          return (
            <SceneCard
              key={sceneId}
              scene={scene}
              index={index}
              onGenerate={() => handleRegenerateClick(sceneId, !!hasImage)}
              onDownload={() => onDownloadScene(sceneId)}
              onClick={() => hasImage && handleOpenFullscreen(scene)}
            />
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
