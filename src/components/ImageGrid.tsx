import { useState } from "react";
import { SceneWithStatus } from "@/types/pack";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, RefreshCw, Play, Image as ImageIcon, Expand, XCircle } from "lucide-react";
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

  // Hover actions sit on a translucent white chip over the photo (conventions §4/§5).
  const overlayIconButtonClass =
    "bg-card/90 hover:bg-card text-foreground backdrop-blur-sm";

  return (
    <>
      <RegenerateConfirmDialog
        open={regenerateConfirm.open}
        onOpenChange={(open) => setRegenerateConfirm({ ...regenerateConfirm, open })}
        onConfirm={handleConfirmRegenerate}
        sceneId={regenerateConfirm.sceneId ?? undefined}
      />

      <div className="w-full h-full overflow-auto p-4">
        <ul className="flex flex-wrap gap-4 list-none m-0 p-0">
          {shots.map((scene) => {
            const sceneId = getSceneId(scene);
            const sceneName = getSceneName(scene);
            const isGenerating = scene.status === "generating";
            const hasImage = scene.status === "success" && scene.imageUrl;
            const isIdle = scene.status === "idle";
            const isError = scene.status === "error";

            return (
              <li
                key={sceneId}
                className="group relative bg-card text-card-foreground rounded-md overflow-hidden flex-shrink-0 cursor-pointer transition-colors duration-fast ease-standard focus-within:ring-2 focus-within:ring-ring"
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

                    {/* Overlay with actions: always visible on touch, hover/focus on desktop */}
                    <div className="absolute inset-0 bg-foreground/25 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 focus-within:opacity-100 transition-opacity duration-fast ease-standard">
                      {/* Scene info */}
                      <div className="absolute top-2 left-2">
                        <Badge variant="default" className="bg-card/90 backdrop-blur-sm max-w-[180px]">
                          <span className="shrink-0">#{sceneId}</span>
                          {sceneName && (
                            <span className="truncate text-muted-foreground">{sceneName}</span>
                          )}
                        </Badge>
                      </div>

                      {/* Expand icon */}
                      <div className="absolute top-2 right-2">
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          className={overlayIconButtonClass}
                          aria-label="Tam ekran görüntüle"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenFullscreen(scene);
                          }}
                        >
                          <Expand strokeWidth={1.5} aria-hidden="true" />
                        </Button>
                      </div>

                      {/* Bottom actions */}
                      <div className="absolute bottom-2 right-2 flex items-center gap-1">
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          className={overlayIconButtonClass}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRegenerateClick(sceneId, true);
                          }}
                          title="Regenerate (will replace current image)"
                          aria-label="Regenerate (will replace current image)"
                        >
                          <RefreshCw strokeWidth={1.5} aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          className={overlayIconButtonClass}
                          aria-label="Download"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownloadShot(sceneId);
                          }}
                        >
                          <Download strokeWidth={1.5} aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="relative w-full aspect-square bg-control flex flex-col items-center justify-center gap-3 p-4">
                    {isGenerating ? (
                      <>
                        <div className="skeleton absolute inset-0" aria-hidden="true" />
                        <Badge variant="default" className="relative">
                          <Loader2 className="animate-spin" aria-hidden="true" />
                          Generating...
                        </Badge>
                      </>
                    ) : (
                      <>
                        {isError ? (
                          <XCircle className="size-6 text-destructive" strokeWidth={1.5} aria-hidden="true" />
                        ) : (
                          <ImageIcon className="size-6 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
                        )}
                        <div className="text-center">
                          <p className="text-heading-xs text-foreground">#{sceneId}</p>
                          {sceneName && (
                            <p className="text-body-sm text-muted-foreground truncate max-w-[200px]">{sceneName}</p>
                          )}
                        </div>
                        {(isIdle || isError) && (
                          <Button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onGenerateShot(sceneId);
                            }}
                            size="sm"
                            variant={isError ? "danger-outline" : "secondary"}
                          >
                            <Play strokeWidth={1.5} aria-hidden="true" />
                            {isError ? "Retry" : "Generate"}
                          </Button>
                        )}
                        {isError && (
                          <p className="text-caption text-danger-text px-2 text-center line-clamp-2" role="alert">
                            {scene.error}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
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
