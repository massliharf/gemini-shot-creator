import { useMemo, type ReactNode } from "react";
import { ArrowUpRight, Maximize2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SampleChip, SampleNotice } from "@/components/SampleNotice";
import { relativeTime, samplePacks, type SamplePack } from "@/data/mock";
import { cn } from "@/lib/utils";
import { MediaAction, mediaActionsVisibility } from "./ResultTile";
import { useLightbox, type LightboxImage } from "./SampleLightbox";
import { SamplePackFeed, SamplePackStatus } from "./SampleResultsFeed";
import { samplePackCreatedAt } from "./sample-utils";

interface PackCollageProps {
  pack: SamplePack;
  onOpen?: () => void;
  className?: string;
}

/** 2×2 collage of a pack's first four scenes; unrendered scenes shimmer. */
export const PackCollage = ({ pack, onOpen, className }: PackCollageProps) => {
  const cells = pack.scenes.slice(0, 4);
  // 1 → full, 2 → halves, 3 → tall first cell + two stacked, 4 → 2×2
  const layout = cells.length === 1 ? "grid-cols-1" : cells.length === 2 ? "grid-cols-2 grid-rows-1" : "grid-cols-2 grid-rows-2";
  const grid = (
    <span className={cn("grid gap-0.5 size-full", layout)} aria-hidden="true">
      {cells.map((s, i) => {
        const span = cells.length === 3 && i === 0 ? "row-span-2" : "";
        return s.imageUrl ? (
          <span key={s.id} className={cn("block overflow-hidden min-h-0", span)}>
            <img
              src={s.imageUrl}
              alt=""
              loading="lazy"
              draggable={false}
              className="size-full object-cover transition-transform duration-slow ease-standard [@media(hover:hover)]:group-hover:scale-[1.04]"
            />
          </span>
        ) : (
          <span key={s.id} className={cn("skeleton !rounded-none size-full", span)} />
        );
      })}
    </span>
  );

  return (
    <div className={cn("relative aspect-square overflow-hidden rounded-md bg-control", className)}>
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Preview ${pack.pack.meta.pack_name}`}
          className="block size-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          {grid}
        </button>
      ) : (
        grid
      )}
      <SampleChip className="pointer-events-none absolute top-2 left-2" />
      {pack.scenes.length > 4 && (
        <span className="pointer-events-none absolute bottom-2 left-2 inline-flex h-6 items-center rounded-xs bg-foreground/25 px-2 text-caption text-white backdrop-blur-sm">
          +{pack.scenes.length - 4}
        </span>
      )}
    </div>
  );
};

interface SamplePackCardProps {
  pack: SamplePack;
  onPreview: () => void;
  onOpenPack?: () => void;
}

/** Generated-pack card: collage, name, scene count and status chips. */
export const SamplePackCard = ({ pack, onPreview, onOpenPack }: SamplePackCardProps) => {
  const createdAt = samplePackCreatedAt(pack);
  const { meta } = pack.pack;
  return (
    <article className="group bg-app rounded-lg p-2 flex flex-col gap-2.5 min-w-0" aria-label={meta.pack_name}>
      <div className="relative">
        <PackCollage pack={pack} onOpen={onPreview} />
        <div className={cn("absolute top-2 right-2 flex items-center gap-1", mediaActionsVisibility)}>
          <MediaAction label="Preview" icon={Maximize2} onClick={onPreview} />
          {onOpenPack && <MediaAction label="View pack" icon={ArrowUpRight} onClick={onOpenPack} />}
        </div>
      </div>
      <div className="px-1.5 pb-1.5 space-y-2 min-w-0">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-baseline gap-2 min-w-0">
            <h3 className="truncate text-label-md text-foreground flex-1 min-w-0" title={meta.pack_name}>
              {meta.pack_name}
            </h3>
            {createdAt && (
              <time dateTime={createdAt} className="hidden sm:inline text-caption text-tertiary-foreground whitespace-nowrap shrink-0">
                {relativeTime(createdAt)}
              </time>
            )}
          </div>
          <p className="text-caption text-muted-foreground line-clamp-1" title={meta.description}>
            {meta.description}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge>{pack.scenes.length} scenes</Badge>
          <SamplePackStatus pack={pack} />
        </div>
      </div>
    </article>
  );
};

interface SamplePackGridProps {
  packs?: SamplePack[];
  onOpenPack?: (pack: SamplePack) => void;
  notice?: ReactNode;
  noticeAction?: ReactNode;
  /** Also show the first pack's rendered scenes below the cards. */
  latestRender?: boolean;
  className?: string;
}

/** Sample generated packs as a card grid (Pack Creator results). */
export const SamplePackGrid = ({
  packs = samplePacks,
  onOpenPack,
  notice = "Your packs will appear here.",
  noticeAction,
  latestRender = false,
  className,
}: SamplePackGridProps) => {
  const flat = useMemo<LightboxImage[]>(
    () =>
      packs.flatMap((p) =>
        p.scenes.filter((s) => s.imageUrl).map((s) => ({ url: s.imageUrl!, title: `${p.pack.meta.pack_name} — ${s.prompt}` })),
      ),
    [packs],
  );
  const lightbox = useLightbox(flat);
  const firstIndex = (p: SamplePack) => flat.findIndex((f) => f.title.startsWith(`${p.pack.meta.pack_name} — `));

  return (
    <div className={cn("space-y-3", className)}>
      <SampleNotice action={noticeAction}>{notice}</SampleNotice>
      {latestRender && <h3 className="text-overline text-muted-foreground px-1 pt-1">Packs</h3>}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
        {packs.map((p) => (
          <SamplePackCard
            key={p.id}
            pack={p}
            onPreview={() => lightbox.open(Math.max(0, firstIndex(p)))}
            onOpenPack={onOpenPack ? () => onOpenPack(p) : undefined}
          />
        ))}
      </div>
      {latestRender && packs[0] && (
        <>
          <h3 className="text-overline text-muted-foreground px-1 pt-3">Latest render</h3>
          <SamplePackFeed packs={[packs[0]]} notice={null} onOpenPack={onOpenPack} />
        </>
      )}
      {lightbox.element}
    </div>
  );
};
