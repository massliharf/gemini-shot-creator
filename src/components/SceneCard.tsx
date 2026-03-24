import { useEffect, useState } from "react";
import { SceneWithStatus, SceneVersion } from "@/types/pack";
import { Button } from "@/components/ui/button";
import { SmartImage } from "@/components/SmartImage";
import { Download, RefreshCw, Trash2, Loader2, History } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface SceneCardProps {
  scene: SceneWithStatus;
  index: number;
  onGenerate: () => void;
  onDownload: () => void;
  onDelete?: () => void;
  onClick?: () => void;
  onRestoreVersion?: (version: SceneVersion) => void;
}

export const SceneCard = ({ scene, index, onGenerate, onDownload, onDelete, onClick, onRestoreVersion }: SceneCardProps) => {
  const sceneId = scene.id ?? index + 1;
  const isGenerating = scene.status === "generating";

  const [activeVersionIndex, setActiveVersionIndex] = useState(0);
  const [showVersions, setShowVersions] = useState(false);
  const [imageBroken, setImageBroken] = useState(false);

  const versions = scene.versions || [];
  const hasVersions = versions.length > 1;

  useEffect(() => {
    setImageBroken(false);
    setActiveVersionIndex(0);
    setShowVersions(false);
  }, [scene.imageUrl, scene.status]);

  const currentImageUrl = activeVersionIndex === 0 
    ? scene.imageUrl 
    : versions[activeVersionIndex]?.imageUrl;

  const hasImage = scene.status === "success" && !!currentImageUrl && !imageBroken;
  const isError = scene.status === "error";

  const handleVersionClick = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveVersionIndex(idx);
    setImageBroken(false);
  };

  return (
    <div className="relative bg-muted/50 overflow-hidden group cursor-pointer h-full w-full flex flex-col rounded-lg" onClick={() => hasImage && onClick?.()}>
      {/* Scene Label */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
        <span className="text-[10px] font-medium text-foreground/80 bg-background/70 backdrop-blur-sm px-1.5 py-0.5 rounded-md">
          {sceneId}
        </span>
        {hasVersions && (
          <button
            className="h-5 px-1.5 text-[10px] bg-background/70 backdrop-blur-sm hover:bg-background/90 rounded-md flex items-center gap-0.5 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setShowVersions(!showVersions);
            }}
          >
            <History className="w-2.5 h-2.5" />
            {versions.length}
          </button>
        )}
      </div>

      {/* Old version badge */}
      {activeVersionIndex > 0 && (
        <div className="absolute top-2 right-2 z-10">
          <span className="text-[10px] bg-warning text-warning-foreground px-1.5 py-0.5 rounded-md">
            Old
          </span>
        </div>
      )}

      {/* Main image area */}
      <div className="flex-1 relative">
        {hasImage ? (
          <>
            <SmartImage
              src={currentImageUrl!}
              alt={`Scene ${sceneId}`}
              fit="cover"
              loading="lazy"
              className="w-full h-full"
              maxRetries={2}
              onFinalError={() => setImageBroken(true)}
            />

            {/* Hover Actions */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 rounded-lg bg-background/90 backdrop-blur-sm hover:bg-background shadow-sm"
                onClick={(e) => { e.stopPropagation(); onGenerate(); }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 rounded-lg bg-background/90 backdrop-blur-sm hover:bg-background shadow-sm"
                onClick={(e) => { e.stopPropagation(); onDownload(); }}
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
              {onDelete && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 rounded-lg bg-background/90 backdrop-blur-sm hover:bg-background shadow-sm"
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center gap-2">
            {isGenerating ? (
              <Loader2 className="w-5 h-5 text-muted-foreground/50 animate-spin" />
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onGenerate(); }}
                className={`rounded-lg text-xs font-medium ${isError ? "text-destructive" : "text-muted-foreground"}`}
              >
                {isError ? "Retry" : "Generate"}
              </Button>
            )}

            {imageBroken && (
              <p className="text-[10px] text-muted-foreground px-3 text-center line-clamp-2">
                Image not found. Regenerate.
              </p>
            )}

            {isError && scene.error && !imageBroken && (
              <p className="text-[10px] text-destructive px-3 text-center line-clamp-2">{scene.error}</p>
            )}
          </div>
        )}
      </div>

      {/* Version history strip */}
      {showVersions && hasVersions && (
        <div 
          className="bg-background/95 backdrop-blur-sm border-t border-border/50 p-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <ScrollArea className="w-full">
            <div className="flex gap-1.5 pb-0.5">
              {versions.map((version, idx) => {
                const isActive = idx === activeVersionIndex;
                const date = new Date(version.generatedAt);
                const timeStr = date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

                return (
                  <button
                    key={version.queueId || idx}
                    onClick={(e) => handleVersionClick(idx, e)}
                    className={`relative flex-shrink-0 w-12 h-12 rounded-md overflow-hidden border transition-all ${
                      isActive ? "border-foreground ring-1 ring-foreground/20" : "border-transparent hover:border-border"
                    }`}
                  >
                    <SmartImage
                      src={version.imageUrl}
                      alt={`V${idx + 1}`}
                      fit="cover"
                      className="w-full h-full"
                      loading="lazy"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 px-0.5 py-px">
                      <p className="text-[7px] text-white text-center truncate">
                        {idx === 0 ? "Latest" : timeStr}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}
    </div>
  );
};
