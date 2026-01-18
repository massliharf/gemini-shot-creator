import { useEffect, useState } from "react";
import { SceneWithStatus, SceneVersion } from "@/types/pack";
import { Button } from "@/components/ui/button";
import { SmartImage } from "@/components/SmartImage";
import { Download, RefreshCw, Trash2, Loader2, History, ChevronLeft, ChevronRight } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface SceneCardProps {
  scene: SceneWithStatus;
  index: number;
  onGenerate: () => void;
  onDownload: () => void;
  onDelete?: () => void;
  onClick?: () => void;
  /** Called when user selects a previous version to restore */
  onRestoreVersion?: (version: SceneVersion) => void;
}

export const SceneCard = ({ scene, index, onGenerate, onDownload, onDelete, onClick, onRestoreVersion }: SceneCardProps) => {
  const sceneId = scene.id ?? index + 1;
  const isGenerating = scene.status === "generating";

  // Track which version is currently being viewed
  const [activeVersionIndex, setActiveVersionIndex] = useState(0);
  const [showVersions, setShowVersions] = useState(false);
  const [imageBroken, setImageBroken] = useState(false);

  const versions = scene.versions || [];
  const hasVersions = versions.length > 1;

  // Reset when scene changes
  useEffect(() => {
    setImageBroken(false);
    setActiveVersionIndex(0);
    setShowVersions(false);
  }, [scene.imageUrl, scene.status]);

  // Get the currently displayed image URL
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

  const handleRestoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeVersionIndex > 0 && versions[activeVersionIndex] && onRestoreVersion) {
      onRestoreVersion(versions[activeVersionIndex]);
    }
  };

  return (
    <div className="relative bg-muted overflow-hidden group cursor-pointer h-full w-full flex flex-col" onClick={() => hasImage && onClick?.()}>
      {/* Scene Label + Version toggle */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <span className="text-xs font-medium text-foreground bg-background/60 backdrop-blur-sm px-2 py-0.5 rounded">
          Scene {sceneId}
        </span>
        {hasVersions && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs bg-background/60 backdrop-blur-sm hover:bg-background/80"
            onClick={(e) => {
              e.stopPropagation();
              setShowVersions(!showVersions);
            }}
          >
            <History className="w-3 h-3 mr-1" />
            {versions.length}
          </Button>
        )}
      </div>

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

            {/* Version indicator */}
            {activeVersionIndex > 0 && (
              <div className="absolute top-3 right-3 z-10">
                <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded">
                  Eski versiyon
                </span>
              </div>
            )}

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
                title="Yeniden üret (yeni versiyon)"
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
                title="İndir"
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
                  title="Sil"
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
                className={`rounded-lg bg-background border-border text-foreground hover:bg-muted ${isError ? "border-destructive text-destructive" : ""}`}
              >
                {isError ? "RETRY" : "GENERATE"}
              </Button>
            )}

            {imageBroken && (
              <p className="text-[10px] text-muted-foreground mt-2 px-3 text-center line-clamp-2">
                Görsel bulunamadı (silinmiş olabilir). Tekrar üret.
              </p>
            )}

            {isError && scene.error && !imageBroken && (
              <p className="text-[10px] text-destructive mt-2 px-3 text-center line-clamp-2">{scene.error}</p>
            )}
          </div>
        )}
      </div>

      {/* Version history strip */}
      {showVersions && hasVersions && (
        <div 
          className="bg-background/95 backdrop-blur-sm border-t border-border p-2"
          onClick={(e) => e.stopPropagation()}
        >
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-1">
              {versions.map((version, idx) => {
                const isActive = idx === activeVersionIndex;
                const date = new Date(version.generatedAt);
                const timeStr = date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
                const dateStr = date.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });

                return (
                  <button
                    key={version.queueId || idx}
                    onClick={(e) => handleVersionClick(idx, e)}
                    className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      isActive ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-muted-foreground/30"
                    }`}
                  >
                    <SmartImage
                      src={version.imageUrl}
                      alt={`Version ${idx + 1}`}
                      fit="cover"
                      className="w-full h-full"
                      loading="lazy"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-0.5">
                      <p className="text-[8px] text-white text-center truncate">
                        {idx === 0 ? "Son" : `${dateStr}`}
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

