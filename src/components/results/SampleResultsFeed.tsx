import { useMemo, type ReactNode } from "react";
import { ArrowUpRight, CheckCircle2, Download, Loader2, Maximize2, TextCursorInput } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SampleNotice } from "@/components/SampleNotice";
import { mockImage, sampleCreations, samplePacks, type SampleCreation, type SamplePack } from "@/data/mock";
import { cn } from "@/lib/utils";
import { downloadImage } from "./download";
import { ResultGrid, ResultGroup } from "./ResultGroup";
import { ResultTile, type TileAction } from "./ResultTile";
import { useLightbox, type LightboxImage } from "./SampleLightbox";
import { samplePackCreatedAt, samplePackProgress } from "./sample-utils";

/* -------------------------------------------------------------------------- */
/* Sample creations (Text to Image)                                           */
/* -------------------------------------------------------------------------- */

interface SampleResultsFeedProps {
  /** Fills the page's prompt field. Enables the "Use prompt" actions. */
  onUsePrompt?: (prompt: string) => void;
  creations?: SampleCreation[];
  /** Text of the sample notice above the feed. */
  notice?: ReactNode;
  noticeAction?: ReactNode;
  className?: string;
}

/**
 * Feed of sample generations grouped by prompt — shown while the person has no
 * results of their own (always the case in demo mode).
 */
export const SampleResultsFeed = ({
  onUsePrompt,
  creations = sampleCreations,
  notice = "Your generations will appear here.",
  noticeAction,
  className,
}: SampleResultsFeedProps) => {
  const flat = useMemo<LightboxImage[]>(
    () => creations.flatMap((c) => c.images.map((key) => ({ url: mockImage(key), title: c.prompt }))),
    [creations],
  );
  const lightbox = useLightbox(flat);

  let offset = 0;
  return (
    <div className={cn("space-y-3", className)}>
      <SampleNotice action={noticeAction}>{notice}</SampleNotice>
      {creations.map((c) => {
        const start = offset;
        offset += c.images.length;
        return (
          <ResultGroup
            key={c.id}
            title={c.prompt}
            meta={[c.model, c.aspect, c.resolution]}
            createdAt={c.createdAt}
            sample
            actions={
              onUsePrompt && (
                <Button type="button" variant="ghost" size="xs" className="text-muted-foreground" onClick={() => onUsePrompt(c.prompt)}>
                  <TextCursorInput strokeWidth={1.5} aria-hidden="true" />
                  Use prompt
                </Button>
              )
            }
          >
            <ResultGrid aria-label={`${c.images.length} sample images`}>
              {c.images.map((key, i) => {
                const url = mockImage(key);
                const actions: TileAction[] = [
                  ...(onUsePrompt ? [{ label: "Use prompt", icon: TextCursorInput, onClick: () => onUsePrompt(c.prompt) }] : []),
                  { label: "Expand", icon: Maximize2, onClick: () => lightbox.open(start + i) },
                  { label: "Download", icon: Download, onClick: () => downloadImage(url, c.prompt) },
                ];
                return (
                  <ResultTile
                    key={key}
                    src={url}
                    alt={`${c.prompt} (${i + 1} of ${c.images.length})`}
                    onOpen={() => lightbox.open(start + i)}
                    actions={actions}
                  />
                );
              })}
            </ResultGrid>
          </ResultGroup>
        );
      })}
      {lightbox.element}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Sample packs as result groups (Bulk Generator)                             */
/* -------------------------------------------------------------------------- */

export const SamplePackStatus = ({ pack }: { pack: SamplePack }) => {
  const { done, total, complete } = samplePackProgress(pack);
  return complete ? (
    <Badge variant="success">
      <CheckCircle2 strokeWidth={1.5} aria-hidden="true" />
      Saved
    </Badge>
  ) : (
    <Badge variant="warning">
      <Loader2 className="animate-spin" strokeWidth={1.5} aria-hidden="true" />
      Rendering {done}/{total}
    </Badge>
  );
};

interface SamplePackFeedProps {
  packs?: SamplePack[];
  /** Opens the pack (e.g. navigates to the Packs page). */
  onOpenPack?: (pack: SamplePack) => void;
  /** Sample notice text; `null` hides the notice (when the page already shows one). */
  notice?: ReactNode;
  noticeAction?: ReactNode;
  className?: string;
}

/** Sample generated packs, each as a result group with its scene grid. */
export const SamplePackFeed = ({
  packs = samplePacks,
  onOpenPack,
  notice = "Your generated packs will appear here.",
  noticeAction,
  className,
}: SamplePackFeedProps) => {
  const flat = useMemo<LightboxImage[]>(
    () =>
      packs.flatMap((p) =>
        p.scenes.filter((s) => s.imageUrl).map((s) => ({ url: s.imageUrl!, title: `${p.pack.meta.pack_name} — ${s.prompt}` })),
      ),
    [packs],
  );
  const lightbox = useLightbox(flat);

  return (
    <div className={cn("space-y-3", className)}>
      {notice !== null && <SampleNotice action={noticeAction}>{notice}</SampleNotice>}
      {packs.map((p) => (
        <ResultGroup
          key={p.id}
          title={p.pack.meta.pack_name}
          meta={[`${p.scenes.length} scenes`, p.pack.meta.category]}
          status={<SamplePackStatus pack={p} />}
          createdAt={samplePackCreatedAt(p)}
          sample
          actions={
            onOpenPack && (
              <Button type="button" variant="ghost" size="xs" className="text-muted-foreground" onClick={() => onOpenPack(p)}>
                View pack
                <ArrowUpRight strokeWidth={1.5} aria-hidden="true" />
              </Button>
            )
          }
        >
          <ResultGrid density="dense" aria-label={`${p.scenes.length} scenes`}>
            {p.scenes.map((s) => {
              const title = `${p.pack.meta.pack_name} — ${s.prompt}`;
              const idx = s.imageUrl ? flat.findIndex((f) => f.url === s.imageUrl && f.title === title) : -1;
              return (
                <ResultTile
                  key={s.id}
                  src={s.imageUrl}
                  alt={`${s.title}: ${s.prompt}`}
                  pendingLabel={s.status === "generating" ? "Rendering" : "Queued"}
                  queued={s.status !== "generating"}
                  onOpen={idx >= 0 ? () => lightbox.open(idx) : undefined}
                  actions={
                    s.imageUrl
                      ? [
                          { label: "Expand", icon: Maximize2, onClick: () => lightbox.open(idx) },
                          { label: "Download", icon: Download, onClick: () => downloadImage(s.imageUrl!, title) },
                        ]
                      : []
                  }
                />
              );
            })}
          </ResultGrid>
        </ResultGroup>
      ))}
      {lightbox.element}
    </div>
  );
};
