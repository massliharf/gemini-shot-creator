import type { ReactNode } from "react";
import { Clock3, Loader2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Icon = LucideIcon;

/**
 * Hover actions on media are always visible on touch screens (no hover) and
 * fade in on hover / keyboard focus everywhere else.
 */
export const mediaActionsVisibility =
  "opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-fast ease-standard";

interface MediaActionProps {
  label: string;
  icon: Icon;
  onClick: () => void;
  className?: string;
}

/** 28px icon button that sits on top of an image (white chip, tooltip on hover). */
export const MediaAction = ({ label, icon: IconCmp, onClick, className }: MediaActionProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        className={cn("bg-card/90 text-foreground hover:bg-card backdrop-blur-sm", className)}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <IconCmp strokeWidth={1.5} aria-hidden="true" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);

export interface TileAction {
  label: string;
  icon: Icon;
  onClick: () => void;
}

interface ResultTileProps {
  /** Image URL. Omit to render a "generating" placeholder. */
  src?: string;
  alt: string;
  /** Opens the image (lightbox). The whole tile becomes a button. */
  onOpen?: () => void;
  actions?: TileAction[];
  /** Optional element in the top-left corner (status badge, scene number…). */
  badge?: ReactNode;
  /** Label for the placeholder when there is no image yet. */
  pendingLabel?: string;
  /** Placeholder is waiting in a queue (static) rather than generating (shimmer + spinner). */
  queued?: boolean;
  className?: string;
}

/** Square, rounded result image with hover actions. */
export const ResultTile = ({ src, alt, onOpen, actions = [], badge, pendingLabel, queued, className }: ResultTileProps) => {
  if (!src) {
    const PendingIcon = queued ? Clock3 : Loader2;
    const label = pendingLabel ?? (queued ? "Queued" : "Generating");
    return (
      <div
        className={cn(
          "relative aspect-square rounded-md flex flex-col items-center justify-center gap-2",
          queued ? "bg-control" : "skeleton",
          className,
        )}
        role="img"
        aria-label={`${label}: ${alt}`}
      >
        <PendingIcon className={cn("size-5 text-muted-foreground", !queued && "animate-spin")} strokeWidth={1.5} aria-hidden="true" />
        <span className="text-caption text-muted-foreground">{label}</span>
        {badge && <div className="absolute top-2 left-2">{badge}</div>}
      </div>
    );
  }

  return (
    <div className={cn("group relative aspect-square overflow-hidden rounded-md bg-control", className)}>
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Open image: ${alt}`}
          className="block size-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <img
            src={src}
            alt=""
            loading="lazy"
            draggable={false}
            className="size-full object-cover transition-transform duration-slow ease-standard [@media(hover:hover)]:group-hover:scale-[1.03]"
          />
        </button>
      ) : (
        <img src={src} alt={alt} loading="lazy" className="size-full object-cover" />
      )}
      <div
        className="pointer-events-none absolute inset-0 bg-foreground/0 transition-colors duration-fast ease-standard [@media(hover:hover)]:group-hover:bg-foreground/10"
        aria-hidden="true"
      />
      {badge && <div className="absolute top-2 left-2">{badge}</div>}
      {actions.length > 0 && (
        <div className={cn("absolute bottom-2 right-2 flex items-center gap-1", mediaActionsVisibility)}>
          {actions.map((a) => (
            <MediaAction key={a.label} label={a.label} icon={a.icon} onClick={a.onClick} />
          ))}
        </div>
      )}
    </div>
  );
};
