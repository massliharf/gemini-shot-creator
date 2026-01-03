import { useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    
    switch (e.key) {
      case 'ArrowLeft':
        if (hasPrevious && onPrevious) onPrevious();
        break;
      case 'ArrowRight':
        if (hasNext && onNext) onNext();
        break;
      case 'Escape':
        onClose();
        break;
    }
  }, [isOpen, hasPrevious, hasNext, onPrevious, onNext, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!imageUrl) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 bg-black/95 border-none rounded-2xl overflow-hidden [&>button]:hidden"
      >
        <div className="relative flex items-center justify-center w-full h-full">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 text-white"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>

          {/* Navigation - Previous */}
          {hasPrevious && onPrevious && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              onClick={onPrevious}
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
          )}

          {/* Navigation - Next */}
          {hasNext && onNext && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              onClick={onNext}
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          )}

          {/* Image */}
          <img
            src={imageUrl}
            alt={sceneName || `Scene ${sceneId}`}
            className="max-w-[90vw] max-h-[85vh] object-contain"
          />

          {/* Bottom info bar */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-between">
              <div>
                {sceneId && (
                  <span className="text-white/80 text-sm font-medium">
                    Scene #{sceneId}
                  </span>
                )}
                {sceneName && (
                  <p className="text-white/60 text-xs">{sceneName}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {onRegenerate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white"
                    onClick={onRegenerate}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate
                  </Button>
                )}
                {onDownload && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white"
                    onClick={onDownload}
                  >
                    <Download className="w-4 h-4 mr-2" />
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
