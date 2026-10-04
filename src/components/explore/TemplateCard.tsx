import { Plus, LayoutTemplate } from "lucide-react";
import { mockImage, type SampleTemplate } from "@/data/mock";
import { cn } from "@/lib/utils";

export const formatUses = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));

/** Pink "+ Flow" / grey "Template" tag (Magnific use-case card). */
export const KindTag = ({ kind, className }: { kind: SampleTemplate["kind"]; className?: string }) => (
  <span
    className={cn(
      "inline-flex h-5 w-fit items-center gap-1 rounded-full px-2 text-micro",
      kind === "Flow" ? "bg-brand-soft text-brand" : "bg-card/90 text-foreground",
      className,
    )}
  >
    {kind === "Flow" ? <Plus className="size-3" strokeWidth={2.25} aria-hidden="true" /> : <LayoutTemplate className="size-3" strokeWidth={2} aria-hidden="true" />}
    {kind}
  </span>
);

/**
 * Use-case card (Explore / Home): light grey r12 tile, tag top-left,
 * bold title bottom-left, media on the right.
 */
export const TemplateCard = ({ template, onOpen, className }: { template: SampleTemplate; onOpen: () => void; className?: string }) => (
  <button
    type="button"
    onClick={onOpen}
    className={cn(
      "group relative flex h-[132px] overflow-hidden rounded-[12px] bg-app text-left transition-colors duration-fast hover:bg-control-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      className,
    )}
  >
    <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-between p-3.5">
      <KindTag kind={template.kind} className={template.kind === "Template" ? "bg-card" : undefined} />
      <div>
        <p className="text-[15px] leading-5 font-semibold text-foreground">{template.title}</p>
        <p className="mt-0.5 text-caption text-muted-foreground line-clamp-1">{template.description}</p>
      </div>
    </div>
    <div className="relative w-[44%] shrink-0">
      <img
        src={mockImage(template.cover)}
        alt=""
        loading="lazy"
        className="absolute inset-y-2 right-2 h-[calc(100%-16px)] w-[calc(100%-8px)] rounded-md object-cover transition-transform duration-slow group-hover:scale-[1.04] group-hover:-rotate-1"
      />
    </div>
  </button>
);
