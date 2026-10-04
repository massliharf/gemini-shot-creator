import { getPackName } from "@/types/pack";
import type { PackInfo } from "@/hooks/usePacks";
import { PackThumb } from "@/components/packs/PackThumb";
import { cn } from "@/lib/utils";

interface PackSwitcherProps {
  packs: PackInfo[];
  selectedPackId: string | null;
  onSelectPack: (packId: string) => void;
  className?: string;
}

/**
 * Horizontal pack strip for small screens, where the pack list lives in a sheet.
 * Lets people hop between packs without opening the panel.
 */
export const PackSwitcher = ({ packs, selectedPackId, onSelectPack, className }: PackSwitcherProps) => {
  if (packs.length < 2) return null;

  return (
    <nav aria-label="Switch pack" className={className}>
      <ul className="flex gap-1.5 overflow-x-auto px-4 md:px-8 scroll-px-4 md:scroll-px-8 pb-1 list-none m-0 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {packs.map((pack) => {
          const name = getPackName(pack.pack);
          const isActive = pack.packId === selectedPackId;
          return (
            <li key={pack.packId} className="snap-start shrink-0">
              <button
                type="button"
                onClick={() => onSelectPack(pack.packId)}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "flex h-control-lg items-center gap-2 rounded-md pl-1 pr-3 text-label-md transition-colors duration-fast ease-standard",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive ? "bg-active text-foreground" : "bg-control text-muted-foreground hover:bg-control-hover hover:text-foreground",
                )}
              >
                <PackThumb name={name} src={pack.thumbnailUrl} className="size-8" />
                <span className="max-w-[160px] truncate">{name}</span>
                <span className="text-caption text-tertiary-foreground tabular-nums">
                  {pack.completedShots}/{pack.totalShots}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
