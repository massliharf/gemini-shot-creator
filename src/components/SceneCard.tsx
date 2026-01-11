import { useState } from "react";
import { SceneWithStatus } from "@/types/pack";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Trash2, Loader2 } from "lucide-react";

interface SceneCardProps {
  scene: SceneWithStatus;
  index: number;
  onGenerate: () => void;
  onDownload: () => void;
  onDelete?: () => void;
  onClick?: () => void;
}

export const SceneCard = ({
  scene,
  index,
  onGenerate,
  onDownload,
  onDelete,
  onClick,
}: SceneCardProps) => {
  const [aspectRatio, setAspectRatio] = useState<number>(1);
  const sceneId = scene.id ?? index + 1;
  const isGenerating = scene.status === "generating";
  const hasImage = scene.status === "success" && scene.imageUrl;
  const isError = scene.status === "error";

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setAspectRatio(img.naturalWidth / img.naturalHeight);
    }
  };

  return (
    <div
      className="relative bg-muted overflow-hidden group cursor-pointer h-full w-full"
      onClick={() => hasImage && onClick?.()}
    >
      {/* Scene Label */}
      <div className="absolute top-3 left-3 z-10">
        <span className="text-xs font-medium text-foreground">
          Scene {sceneId}
        </span>
      </div>

      {hasImage ? (
        <>
          <img
            src={scene.imageUrl!}
            alt={`Scene ${sceneId}`}
            className="w-full h-full object-cover"
            loading="lazy"
            onLoad={handleImageLoad}
          />

          {/* Hover Actions */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="secondary"
              className="h-9 w-9 rounded-lg bg-background/90 backdrop-blur-sm hover:bg-background"
              onClick={(e) => {
                e.stopPropagation();
                onGenerate();
              }}
              title="Regenerate"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-9 w-9 rounded-lg bg-background/90 backdrop-blur-sm hover:bg-background"
              onClick={(e) => {
                e.stopPropagation();
                onDownload();
              }}
              title="Download"
            >
              <Download className="w-4 h-4" />
            </Button>
            {onDelete && (
              <Button
                size="icon"
                variant="secondary"
                className="h-9 w-9 rounded-lg bg-background/90 backdrop-blur-sm hover:bg-background"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </>
      ) : (
        <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center">
          {isGenerating ? (
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onGenerate();
              }}
              className={`rounded-lg bg-background border-border text-foreground hover:bg-muted ${isError ? 'border-destructive text-destructive' : ''}`}
            >
              {isError ? 'RETRY' : 'GENERATE'}
            </Button>
          )}
          {isError && scene.error && (
            <p className="text-[10px] text-destructive mt-2 px-3 text-center line-clamp-2">
              {scene.error}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
