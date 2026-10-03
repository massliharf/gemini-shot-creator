import { useEffect, useState } from "react";
import { SceneWithStatus, SceneVersion } from "@/types/pack";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SmartImage } from "@/components/SmartImage";
import { Download, RefreshCw, Trash2, Loader2, History, XCircle, ImageOff } from "lucide-react";
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

  const overlayActionClass = "bg-card/90 backdrop-blur-sm hover:bg-card text-foreground";

  return (
    <div
      className={`relative bg-control overflow-hidden group h-full w-full flex flex-col rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${hasImage ? "cursor-pointer" : ""}`}
      role={hasImage ? "button" : undefined}
      tabIndex={hasImage ? 0 : undefined}
      aria-label={hasImage ? `Open scene ${sceneId} fullscreen` : undefined}
      onClick={() => hasImage && onClick?.()}
    >
      {/* Scene Label */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
        <Badge className="bg-card/90 backdrop-blur-sm border-transparent">
          {sceneId}
        </Badge>
        {hasVersions && (
          <button
            type="button"
            aria-label={`${versions.length} versions, ${showVersions ? "hide" : "show"} history`}
            aria-expanded={showVersions}
            className="inline-flex items-center gap-1 h-6 px-2 rounded-xs text-caption bg-card/90 backdrop-blur-sm text-foreground hover:bg-card transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={(e) => {
              e.stopPropagation();
              setShowVersions(!showVersions);
            }}
          >
            <History className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
            {versions.length}
          </button>
        )}
      </div>

      {/* Old version badge */}
      {activeVersionIndex > 0 && (
        <div className="absolute top-2 right-2 z-10">
          <Badge variant="warning">
            <History strokeWidth={1.5} aria-hidden="true" />
            Old
          </Badge>
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

            {/* Hover Actions (always visible on mobile, hover/focus on desktop) */}
            <div className="absolute inset-0 bg-foreground/0 md:group-hover:bg-foreground/10 transition-colors duration-fast ease-standard pointer-events-none" aria-hidden="true" />
            <div
              className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity duration-fast ease-standard"
              role="group"
              aria-label={`Scene ${sceneId} actions`}
            >
              <Button
                size="icon-sm"
                variant="ghost"
                className={overlayActionClass}
                aria-label="Regenerate scene"
                onClick={(e) => { e.stopPropagation(); onGenerate(); }}
              >
                <RefreshCw strokeWidth={1.5} aria-hidden="true" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                className={overlayActionClass}
                aria-label="Download scene"
                onClick={(e) => { e.stopPropagation(); onDownload(); }}
              >
                <Download strokeWidth={1.5} aria-hidden="true" />
              </Button>
              {onDelete && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className={`${overlayActionClass} hover:text-destructive`}
                  aria-label="Delete scene"
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                >
                  <Trash2 strokeWidth={1.5} aria-hidden="true" />
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="w-full h-full min-h-[120px] flex flex-col items-center justify-center gap-2 p-3">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-1.5" role="status" aria-live="polite">
                <Loader2 className="size-5 text-muted-foreground animate-spin" strokeWidth={1.5} aria-hidden="true" />
                <span className="text-caption text-muted-foreground">Generating...</span>
              </div>
            ) : (
              <Button
                variant={isError ? "danger-outline" : "outline"}
                size="sm"
                onClick={(e) => { e.stopPropagation(); onGenerate(); }}
              >
                {isError ? <XCircle strokeWidth={1.5} aria-hidden="true" /> : <RefreshCw strokeWidth={1.5} aria-hidden="true" />}
                {isError ? "Retry" : "Generate"}
              </Button>
            )}

            {imageBroken && (
              <p className="text-caption text-muted-foreground text-center line-clamp-2 inline-flex items-center gap-1">
                <ImageOff className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                Image not found. Regenerate.
              </p>
            )}

            {isError && scene.error && !imageBroken && (
              <p className="text-caption text-destructive text-center line-clamp-2">{scene.error}</p>
            )}
          </div>
        )}
      </div>

      {/* Version history strip */}
      {showVersions && hasVersions && (
        <div
          className="bg-card/95 backdrop-blur-sm p-2"
          onClick={(e) => e.stopPropagation()}
        >
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-1" role="listbox" aria-label="Scene versions">
              {versions.map((version, idx) => {
                const isActive = idx === activeVersionIndex;
                const date = new Date(version.generatedAt);
                const timeStr = date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

                return (
                  <button
                    key={version.queueId || idx}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    aria-label={idx === 0 ? "Latest version" : `Version from ${timeStr}`}
                    onClick={(e) => handleVersionClick(idx, e)}
                    className={`relative flex-shrink-0 size-12 rounded-md overflow-hidden bg-control transition-[box-shadow,background-color] duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isActive ? "ring-1 ring-foreground/80" : "hover:bg-control-hover"
                    }`}
                  >
                    <SmartImage
                      src={version.imageUrl}
                      alt={`V${idx + 1}`}
                      fit="cover"
                      className="w-full h-full"
                      loading="lazy"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-foreground/60 px-0.5 py-px">
                      <p className="text-caption leading-tight text-white text-center truncate">
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

// TODO(magnific): the card root is a clickable div (role="button" when it has an image); keyboard Enter/Space activation needs a new handler and is left for a logic pass.
