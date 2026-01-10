import { useState } from "react";
import { SceneWithStatus } from "@/types/pack";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Play, Image as ImageIcon, Expand, AlertTriangle } from "lucide-react";
import { Loader2 } from "lucide-react";
import { FullscreenImageView } from "./FullscreenImageView";
import { SmartImage } from "@/components/SmartImage";
import { RegenerateConfirmDialog } from "./RegenerateConfirmDialog";

interface ImageGridProps {
  shots: SceneWithStatus[];
  onGenerateShot: (sceneId: string | number) => void;
  onDownloadShot: (sceneId: string | number) => void;
}

const getSceneId = (scene: any): string | number => {
  return scene.id ?? scene.scene_id ?? "0";
};

const getSceneName = (scene: any): string => {
  return scene.name || scene.title || "";
};

export const ImageGrid = ({ shots, onGenerateShot, onDownloadShot }: ImageGridProps) => {
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const [regenerateConfirm, setRegenerateConfirm] = useState<{
    open: boolean;
    sceneId: string | number | null;
  }>({ open: false, sceneId: null });

  const successfulShots = shots.filter((s) => s.status === "success" && s.imageUrl);
  const currentFullscreenShot = fullscreenIndex !== null ? successfulShots[fullscreenIndex] : null;

  const handleOpenFullscreen = (scene: SceneWithStatus) => {
    const idx = successfulShots.findIndex((s) => getSceneId(s) === getSceneId(scene));
    if (idx !== -1) setFullscreenIndex(idx);
  };

  const handlePrevious = () => {
    if (fullscreenIndex !== null && fullscreenIndex > 0) {
      setFullscreenIndex(fullscreenIndex - 1);
    }
  };

  const handleNext = () => {
    if (fullscreenIndex !== null && fullscreenIndex < successfulShots.length - 1) {
      setFullscreenIndex(fullscreenIndex + 1);
    }
  };

  // Handle regeneration with confirmation for successful scenes
  const handleRegenerateClick = (sceneId: string | number, hasExistingImage: boolean) => {
    if (hasExistingImage) {
      // Show confirmation dialog for regenerating existing images
      setRegenerateConfirm({ open: true, sceneId });
    } else {
      // Direct generation for idle/error scenes
      onGenerateShot(sceneId);
    }
  };

  const handleConfirmRegenerate = () => {
    if (regenerateConfirm.sceneId !== null) {
      onGenerateShot(regenerateConfirm.sceneId);
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

      <div className="w-full h-full overflow-auto p-4">
        <div className="flex flex-wrap gap-3">
          {shots.map((scene) => {
            const sceneId = getSceneId(scene);
            const sceneName = getSceneName(scene);
            const isGenerating = scene.status === "generating";
            const hasImage = scene.status === "success" && scene.imageUrl;
            const isIdle = scene.status === "idle";
            const isError = scene.status === "error";

            return (
              <div
                key={sceneId}
                className="group relative bg-secondary rounded-2xl overflow-hidden flex-shrink-0 cursor-pointer"
                style={{ minWidth: "280px", maxWidth: "420px", flex: "1 1 300px" }}
                onClick={() => hasImage && handleOpenFullscreen(scene)}
              >
                {hasImage ? (
                  <>
                    <SmartImage
                      src={scene.imageUrl!}
                      alt={sceneName || `Scene ${sceneId}`}
                      className="w-full h-auto"
                      loading="lazy"
                      maxRetries={3}
                    />

                    {/* Hover overlay with actions */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      {/* Scene info */}
                      <div className="absolute top-2 left-2">
                        <span className="text-white/80 text-xs font-medium">#{sceneId}</span>
                        {sceneName && (
                          <p className="text-white/60 text-[10px] truncate max-w-[120px]">{sceneName}</p>
                        )}
                      </div>

                      {/* Expand icon */}
                      <div className="absolute top-2 right-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 bg-black/50 hover:bg-black/70 text-white rounded-lg backdrop-blur-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenFullscreen(scene);
                          }}
                        >
                          <Expand className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      {/* Bottom actions */}
                      <div className="absolute bottom-2 right-2 flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 bg-amber-600/80 hover:bg-amber-600 text-white rounded-lg backdrop-blur-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRegenerateClick(sceneId, true);
                          }}
                          title="Regenerate (will replace current image)"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 bg-black/50 hover:bg-black/70 text-white rounded-lg backdrop-blur-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownloadShot(sceneId);
                          }}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full aspect-square flex flex-col items-center justify-center gap-2 p-3">
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-xs text-muted-foreground">Generating...</p>
                      </>
                    ) : (
                      <>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isError ? 'bg-destructive/10' : 'bg-muted/50'}`}>
                          {isError ? (
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
                          )}
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">#{sceneId}</p>
                          {sceneName && (
                            <p className="text-[10px] text-muted-foreground/60 truncate max-w-[100px]">{sceneName}</p>
                          )}
                        </div>
                        {(isIdle || isError) && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onGenerateShot(sceneId);
                            }}
                            size="sm"
                            className={`gap-1.5 h-7 text-xs border-0 ${
                              isError 
                                ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' 
                                : 'bg-primary/10 text-primary hover:bg-primary/20'
                            }`}
                          >
                            <Play className="w-3 h-3" />
                            {isError ? 'Retry' : 'Generate'}
                          </Button>
                        )}
                        {isError && (
                          <p className="text-[10px] text-destructive px-2 text-center line-clamp-2">{scene.error}</p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Fullscreen viewer */}
      <FullscreenImageView
        isOpen={fullscreenIndex !== null}
        onClose={() => setFullscreenIndex(null)}
        imageUrl={currentFullscreenShot?.imageUrl || null}
        sceneName={currentFullscreenShot ? getSceneName(currentFullscreenShot) : undefined}
        sceneId={currentFullscreenShot ? getSceneId(currentFullscreenShot) : undefined}
        onDownload={() => currentFullscreenShot && onDownloadShot(getSceneId(currentFullscreenShot))}
        onRegenerate={() => {
          if (currentFullscreenShot) {
            handleRegenerateClick(getSceneId(currentFullscreenShot), true);
          }
        }}
        onPrevious={handlePrevious}
        onNext={handleNext}
        hasPrevious={fullscreenIndex !== null && fullscreenIndex > 0}
        hasNext={fullscreenIndex !== null && fullscreenIndex < successfulShots.length - 1}
      />
    </>
  );
};
