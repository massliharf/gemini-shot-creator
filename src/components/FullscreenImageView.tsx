import { useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

interface FullscreenImageViewProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  sceneName?: string;
  sceneId?: string | number;
  onDownload?: () => void;
  onRegenerate?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

// Lightbox-only control style: white ghost buttons over the dark media overlay (§1 "Medya üstü overlay")
const lightboxControlClass =
  "text-white hover:bg-card/15 hover:text-white focus-visible:ring-white/60 focus-visible:ring-offset-0";

export const FullscreenImageView = ({
  isOpen,
  onClose,
  imageUrl,
  sceneName,
  sceneId,
  onDownload,
  onRegenerate,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: FullscreenImageViewProps) => {
  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowLeft":
          if (hasPrevious && onPrevious) onPrevious();
          break;
        case "ArrowRight":
          if (hasNext && onNext) onNext();
          break;
        case "Escape":
          onClose();
          break;
      }
    },
    [isOpen, hasPrevious, hasNext, onPrevious, onNext, onClose],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!imageUrl) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 bg-foreground/90 text-white border-none shadow-none rounded-lg overflow-hidden [&>button]:hidden">
        {/* a11y requirements for Radix Dialog */}
        <DialogTitle className="sr-only">Fullscreen image preview</DialogTitle>
        <DialogDescription className="sr-only">
          Preview for {sceneName || `Scene ${sceneId}`}. Use left and right arrow keys to navigate.
        </DialogDescription>

        <div className="relative flex items-center justify-center w-full h-full">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className={`absolute top-3 right-3 md:top-4 md:right-4 z-10 ${lightboxControlClass}`}
            aria-label="Close preview"
            onClick={onClose}
          >
            <X strokeWidth={1.5} aria-hidden="true" />
          </Button>

          {/* Navigation - Previous */}
          {hasPrevious && onPrevious && (
            <Button
              variant="ghost"
              size="icon-lg"
              className={`absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 ${lightboxControlClass}`}
              aria-label="Previous image"
              onClick={onPrevious}
            >
              <ChevronLeft strokeWidth={1.5} aria-hidden="true" />
            </Button>
          )}

          {/* Navigation - Next */}
          {hasNext && onNext && (
            <Button
              variant="ghost"
              size="icon-lg"
              className={`absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 ${lightboxControlClass}`}
              aria-label="Next image"
              onClick={onNext}
            >
              <ChevronRight strokeWidth={1.5} aria-hidden="true" />
            </Button>
          )}

          {/* Image */}
          <img src={imageUrl} alt={sceneName || `Scene ${sceneId}`} className="max-w-[90vw] max-h-[85vh] object-contain" />

          {/* Bottom info bar */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-foreground/60 safe-bottom">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                {sceneId && <span className="text-label-md text-white">Scene #{sceneId}</span>}
                {sceneName && <p className="text-caption text-white/70 truncate">{sceneName}</p>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {onRegenerate && (
                  <Button
                    variant="ghost"
                    size="md"
                    className={lightboxControlClass}
                    onClick={onRegenerate}
                  >
                    <RefreshCw strokeWidth={1.5} aria-hidden="true" />
                    Regenerate
                  </Button>
                )}
                {onDownload && (
                  <Button
                    variant="ghost"
                    size="md"
                    className={lightboxControlClass}
                    onClick={onDownload}
                  >
                    <Download strokeWidth={1.5} aria-hidden="true" />
                    Download
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// TODO(magnific): a "current / total" image counter in the lightbox needs index/total props that this component does not receive; left for a logic pass.
