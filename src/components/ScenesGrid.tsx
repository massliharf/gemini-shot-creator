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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
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
