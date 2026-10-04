import { Layers, MoreVertical, PencilLine, Wand2 } from "lucide-react";
import { mockImage, relativeTime, type SampleStyle } from "@/data/mock";
import { SampleChip } from "@/components/SampleNotice";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface SampleStyleCardProps {
  style: SampleStyle;
  /** Primary action — opens the style in Pack Creator. */
  onUse: () => void;
  onEdit: () => void;
}

/** ~190px style card: 2×2 collage cover, name overlay bottom-left, scene count chip, ⋮ menu. */
export const SampleStyleCard = ({ style, onUse, onEdit }: SampleStyleCardProps) => {
  const covers = style.covers.slice(0, 4);

  return (
    <li className="group min-w-0">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[12px] bg-control">
        <button
          type="button"
          onClick={onUse}
          aria-label={`Use ${style.name} in Pack Creator`}
          className="absolute inset-0 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring rounded-[12px]"
        >
          <span className="grid size-full grid-cols-2 grid-rows-2 gap-0.5" aria-hidden="true">
            {covers.map((key, i) => (
              <img
                key={key + i}
                src={mockImage(key)}
                alt=""
                loading="lazy"
                className={cn(
                  "size-full min-h-0 object-cover transition-transform duration-slow ease-standard md:group-hover:scale-[1.03]",
                  covers.length === 3 && i === 0 && "row-span-2",
                )}
              />
            ))}
          </span>
          <span
            className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-foreground/75 via-foreground/25 to-transparent dark:from-black/75 dark:via-black/25"
            aria-hidden="true"
          />
        </button>

        <SampleChip className="pointer-events-none absolute left-2 top-2" />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end gap-2 p-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="truncate text-heading-xs font-semibold text-white">{style.name}</p>
            <span className="inline-flex h-5 items-center gap-1 rounded-xs bg-card/90 px-1.5 text-caption text-foreground backdrop-blur-sm">
              <Layers className="size-3" strokeWidth={1.5} aria-hidden="true" />
              <span className="tabular-nums">{style.scenes}</span> scenes
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="pointer-events-auto shrink-0 bg-card/90 text-foreground backdrop-blur-sm hover:bg-card"
                aria-label={`More actions for ${style.name}`}
              >
                <MoreVertical strokeWidth={1.5} aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="gap-2" onSelect={onUse}>
                <Wand2 className="size-4" strokeWidth={1.5} aria-hidden="true" />
                Use in Pack Creator
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2" onSelect={onEdit}>
                <PencilLine className="size-4" strokeWidth={1.5} aria-hidden="true" />
                Open Pack Editor
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <p className="mt-2 truncate px-0.5 text-caption text-tertiary-foreground">
        {style.category} · {relativeTime(style.updatedAt)}
      </p>
    </li>
  );
};
