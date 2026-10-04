import { useEffect, useState } from "react";
import { SceneWithStatus, SceneVersion } from "@/types/pack";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SmartImage } from "@/components/SmartImage";
import { Download, RefreshCw, Trash2, Loader2, History, XCircle, ImageOff, Sparkles } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface SceneCardProps {
  scene: SceneWithStatus;
  index: number;
  onGenerate: () => void;
  onDownload: () => void;
  onDelete?: () => void;
  onClick?: () => void;
  onRestoreVersion?: (version: SceneVersion) => void;
}

/** Translucent white chip used for labels/buttons that sit on top of an image. */
const onImageChip = "bg-card/90 backdrop-blur-sm text-foreground hover:bg-card border-transparent";

export const SceneCard = ({ scene, index, onGenerate, onDownload, onDelete, onClick }: SceneCardProps) => {
  const sceneId = scene.id ?? index + 1;
  const title = scene.title || `Scene ${sceneId}`;
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
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-md bg-control group flex flex-col",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        hasImage && "cursor-zoom-in",
      )}
      role={hasImage ? "button" : undefined}
      tabIndex={hasImage ? 0 : undefined}
      aria-label={hasImage ? `Open ${title} fullscreen` : undefined}
      onClick={() => hasImage && onClick?.()}
      onKeyDown={(e) => {
        if (!hasImage || e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Scene number + version history */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
        <Badge
          className={cn(
            "tabular-nums",
            hasImage ? onImageChip : isGenerating ? "bg-card border-transparent" : "bg-control border-transparent",
          )}
        >
          {sceneId}
        </Badge>
        {hasVersions && (
          <button
            type="button"
            aria-label={`${versions.length} versions, ${showVersions ? "hide" : "show"} history`}
            aria-expanded={showVersions}
            className={cn(
              "inline-flex items-center gap-1 h-6 px-2 rounded-xs text-caption transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              onImageChip,
            )}
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

      {/* Main area */}
      <div className="relative flex-1 min-h-0">
        {hasImage ? (
          <>
            <SmartImage
              src={currentImageUrl!}
              alt={scene.prompt ? `${title}: ${scene.prompt}` : title}
              fit="cover"
              loading="lazy"
              className="w-full h-full transition-transform duration-slow ease-standard md:group-hover:scale-[1.02]"
              maxRetries={2}
              onFinalError={() => setImageBroken(true)}
            />

            {/* Caption + actions — always visible on touch, on hover/focus with a pointer */}
            <div
              className={cn(
                "absolute inset-x-0 bottom-0 flex items-end gap-2 p-2 pt-10 text-white",
                "bg-gradient-to-t from-foreground/70 via-foreground/25 to-transparent dark:from-black/70 dark:via-black/25",
                "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity duration-fast ease-standard",
              )}
            >
              <div className="min-w-0 flex-1 pl-1 pb-0.5">
                <p className="truncate text-label-md">{title}</p>
                {scene.prompt && <p className="hidden sm:block truncate text-caption text-white/75">{scene.prompt}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-1" role="group" aria-label={`${title} actions`}>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className={onImageChip}
                  aria-label={`Regenerate ${title}`}
                  title="Regenerate"
                  onClick={(e) => { e.stopPropagation(); onGenerate(); }}
                >
                  <RefreshCw strokeWidth={1.5} aria-hidden="true" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className={onImageChip}
                  aria-label={`Download ${title}`}
                  title="Download"
                  onClick={(e) => { e.stopPropagation(); onDownload(); }}
                >
                  <Download strokeWidth={1.5} aria-hidden="true" />
                </Button>
                {onDelete && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className={cn(onImageChip, "hover:text-destructive")}
                    aria-label={`Delete ${title}`}
                    title="Delete"
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  >
                    <Trash2 strokeWidth={1.5} aria-hidden="true" />
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : isGenerating ? (
          /* Generating: shimmer skeleton with a quiet status */
          <div className="absolute inset-0" role="status" aria-live="polite" aria-label={`${title} generating`}>
            <div className="skeleton absolute inset-0 rounded-none motion-reduce:animate-pulse" aria-hidden="true" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-card text-foreground" aria-hidden="true">
                <Loader2 className="size-4 animate-spin" strokeWidth={2} />
              </span>
              <span className="text-label-md text-foreground">Generating…</span>
            </div>
            {scene.prompt && (
              <p className="absolute inset-x-0 bottom-0 p-3 text-caption text-muted-foreground line-clamp-2" aria-hidden="true">
                {scene.prompt}
              </p>
            )}
          </div>
        ) : (
          /* Idle / error / broken image: clean dashed placeholder */
          <div
            className={cn(
              "absolute inset-0 flex flex-col justify-end gap-2 rounded-md border border-dashed p-3",
              isError ? "border-danger-border bg-danger-bg/40" : "border-border bg-background",
            )}
          >
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
              <span
                className={cn(
                  "flex size-10 items-center justify-center rounded-full",
                  isError ? "bg-danger-bg text-danger-text" : "bg-control text-muted-foreground",
                )}
              >
                {isError || imageBroken ? (
                  <ImageOff className="size-4" strokeWidth={1.5} />
                ) : (
                  <Sparkles className="size-4" strokeWidth={1.5} />
                )}
              </span>
            </div>

            <div className="relative min-w-0 space-y-0.5">
              <p className="truncate text-label-md text-foreground">{title}</p>
              {imageBroken ? (
                <p className="text-caption text-muted-foreground line-clamp-2">Image not found. Regenerate.</p>
              ) : isError && scene.error ? (
                <p className="text-caption text-destructive line-clamp-2">{scene.error}</p>
              ) : (
                scene.prompt && <p className="text-caption text-muted-foreground line-clamp-2">{scene.prompt}</p>
              )}
            </div>

            <Button
              variant={isError ? "danger-outline" : "outline"}
              size="sm"
              className="relative w-fit"
              aria-label={`${isError ? "Retry" : "Generate"} ${title}`}
              onClick={(e) => { e.stopPropagation(); onGenerate(); }}
            >
              {isError ? <XCircle strokeWidth={1.5} aria-hidden="true" /> : <RefreshCw strokeWidth={1.5} aria-hidden="true" />}
              {isError ? "Retry" : imageBroken ? "Regenerate" : "Generate"}
            </Button>
          </div>
        )}
      </div>

      {/* Version history strip */}
      {showVersions && hasVersions && (
        <div
          className="absolute inset-x-0 bottom-0 z-20 bg-card/95 backdrop-blur-sm p-2"
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
