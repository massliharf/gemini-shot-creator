import { useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, ChevronRight, Copy, Heart, Loader2, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { TemplateCard, KindTag, formatUses } from "@/components/explore/TemplateCard";
import { categoryClasses, type Category } from "@/components/IconRail";
import { useRequireUser } from "@/hooks/useRequireUser";
import {
  mockImage,
  sampleTemplates,
  portraitSet,
  productSet,
  spaceSet,
  closeSet,
  type CategoryKey,
  type MockImageKey,
  type SampleTemplate,
} from "@/data/mock";
import { cn } from "@/lib/utils";

type Tab = "discover" | "use-cases" | "templates" | "community";
const TABS: { key: Tab; label: string }[] = [
  { key: "discover", label: "Discover" },
  { key: "use-cases", label: "Use cases" },
  { key: "templates", label: "Templates" },
  { key: "community", label: "Community" },
];

const FILTERS: { key: "all" | CategoryKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "spaces", label: "Flows" },
  { key: "image", label: "Image" },
  { key: "3d", label: "3D" },
  { key: "design", label: "Design" },
];

const authors = ["Mira K.", "Studio Ora", "Atelier N", "Deniz A.", "Lumra", "Jun P.", "Ece T.", "Noor H."];

/** Deterministic community feed built from every mock image. */
const communityKeys: MockImageKey[] = [
  ...portraitSet,
  ...spaceSet,
  ...productSet,
  ...closeSet,
  "space-detail-terracotta",
  "product-detail-lilac",
];
const community: { key: MockImageKey; author: string; likes: number; tall: boolean }[] = communityKeys.map((key, i) => ({ key, author: authors[i % authors.length], likes: 120 + ((i * 137) % 900), tall: i % 3 === 0 }));

const Explore = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useRequireUser();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>("discover");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [query, setQuery] = useState("");
  const [liked, setLiked] = useState<Set<number>>(new Set());

  const openId = params.get("template");
  const active = sampleTemplates.find((t) => t.id === openId) ?? null;
  // Opening from this page pushes an entry, so closing pops it and Back stays meaningful.
  // A direct ?template= link (Home, reload of a deep link) has no entry to pop: just clear the param.
  const openTemplate = (t: SampleTemplate) => setParams({ template: t.id }, { state: { templateFromExplore: true } });
  const closeTemplate = () =>
    (location.state as { templateFromExplore?: boolean } | null)?.templateFromExplore
      ? navigate(-1)
      : setParams({}, { replace: true });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sampleTemplates.filter(
      (t) =>
        (filter === "all" || t.category === filter) &&
        (!q || `${t.title} ${t.description} ${t.prompt}`.toLowerCase().includes(q)),
    );
  }, [filter, query]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" role="status" aria-live="polite">
        <Loader2 className="size-5 animate-spin text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
      </div>
    );
  }

  const featured = filtered.filter((t) => t.section === "featured");
  const useCases = filtered.filter((t) => t.section === "use-case");
  const templates = filtered.filter((t) => t.section === "template");

  const useTemplate = (t: SampleTemplate) => navigate(`${t.path}?prompt=${encodeURIComponent(t.prompt)}`);

  return (
    <AppLayout userEmail={user.email}>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1240px] px-4 md:px-8 pt-4 md:pt-8 pb-28">
          {/* Big text tabs */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div role="tablist" aria-label="Explore sections" className="flex gap-6 overflow-x-auto no-scrollbar">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  role="tab"
                  type="button"
                  aria-selected={tab === t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "relative shrink-0 pb-2 text-[22px] md:text-[24px] leading-8 font-semibold tracking-[-0.02em] transition-colors duration-fast",
                    tab === t.key ? "text-foreground" : "text-[#C7C7C7] hover:text-muted-foreground dark:text-[#4A4A4A]",
                  )}
                >
                  {t.label}
                  <span
                    className={cn(
                      "absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-brand transition-transform duration-normal origin-left",
                      tab === t.key ? "scale-x-100" : "scale-x-0",
                    )}
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 lg:w-[260px] lg:flex-none">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-tertiary-foreground" strokeWidth={1.5} aria-hidden="true" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search templates"
                  aria-label="Search templates"
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          {/* Category filter */}
          {tab !== "community" && (
            <div className="mt-5 pill-tabs" role="group" aria-label="Filter by category">
              {FILTERS.map((f) => (
                <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)} className="pill-tab">
                  {f.key !== "all" && (
                    <span className={cn("size-2 rounded-full", categoryClasses[f.key as Category].dot)} aria-hidden="true" />
                  )}
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {tab === "discover" && (
            <>
              {featured.length > 0 && (
                <section aria-label="Featured" className="mt-6 grid gap-3 lg:grid-cols-3">
                  {featured.map((t, i) => (
                    <FeaturedCard key={t.id} template={t} large={i === 0} onOpen={() => openTemplate(t)} />
                  ))}
                </section>
              )}
              <Section title="Trending use cases" onSeeAll={() => setTab("use-cases")}>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  {useCases.slice(0, 4).map((t) => (
                    <TemplateCard key={t.id} template={t} onOpen={() => openTemplate(t)} />
                  ))}
                </div>
              </Section>
              <Section title="Community picks" onSeeAll={() => setTab("community")}>
                <CommunityGrid items={community.slice(0, 10)} liked={liked} onLike={setLiked} />
              </Section>
            </>
          )}

          {tab === "use-cases" && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {[...useCases, ...featured].map((t) => (
                <TemplateCard key={t.id} template={t} onOpen={() => openTemplate(t)} />
              ))}
              {useCases.length + featured.length === 0 && <EmptyResults />}
            </div>
          )}

          {tab === "templates" && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {[...templates, ...useCases, ...featured].map((t) => (
                <PosterCard key={t.id} template={t} onOpen={() => openTemplate(t)} />
              ))}
              {filtered.length === 0 && <EmptyResults />}
            </div>
          )}

          {tab === "community" && (
            <div className="mt-6">
              <CommunityGrid items={community} liked={liked} onLike={setLiked} />
            </div>
          )}
        </div>
      </main>

      <TemplateDialog template={active} onClose={closeTemplate} onUse={useTemplate} />
    </AppLayout>
  );
};

/* ------------------------------------------------------------------ */

const Section = ({ title, onSeeAll, children }: { title: string; onSeeAll?: () => void; children: React.ReactNode }) => (
  <section className="mt-10">
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-heading-md text-foreground">{title}</h2>
      {onSeeAll && (
        <Button variant="ghost" size="md" className="-mr-2 text-muted-foreground hover:text-foreground" onClick={onSeeAll}>
          See all
          <ChevronRight aria-hidden="true" />
        </Button>
      )}
    </div>
    {children}
  </section>
);

const EmptyResults = () => (
  <div className="col-span-full flex flex-col items-center py-16 text-center">
    <Search className="size-5 text-muted-foreground mb-3" strokeWidth={1.5} aria-hidden="true" />
    <p className="text-heading-md text-foreground">No templates found</p>
    <p className="text-body-sm text-muted-foreground">Try another word or category.</p>
  </div>
);

const FeaturedCard = ({ template, large, onOpen }: { template: SampleTemplate; large?: boolean; onOpen: () => void }) => (
  <button
    type="button"
    onClick={onOpen}
    className={cn(
      "group relative overflow-hidden rounded-lg bg-card text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      large ? "lg:row-span-1" : "",
    )}
  >
    <div className="flex h-[260px] gap-1 p-1">
      <div className="relative min-w-0 flex-[2] overflow-hidden rounded-[12px]">
        <img src={mockImage(template.cover)} alt="" className="absolute inset-0 size-full object-cover transition-transform duration-slow group-hover:scale-[1.03]" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {(template.gallery ?? []).slice(0, 3).map((g) => (
          <div key={g} className="relative min-h-0 flex-1 overflow-hidden rounded-md">
            <img src={mockImage(g)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
          </div>
        ))}
      </div>
    </div>
    <div className="flex items-start gap-3 px-4 pb-4 pt-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <KindTag kind={template.kind} className={template.kind === "Template" ? "bg-control" : undefined} />
          {template.isNew && <span className="inline-flex h-5 items-center rounded-full bg-brand px-2 text-micro text-white">New</span>}
        </div>
        <p className="mt-2 text-heading-sm text-foreground">{template.title}</p>
        <p className="text-caption text-muted-foreground line-clamp-1">{template.description}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
        <span className="text-label-md text-foreground tabular-nums">{formatUses(template.uses)}</span>
        <span className="text-caption text-tertiary-foreground">uses</span>
      </div>
    </div>
  </button>
);

const PosterCard = ({ template, onOpen }: { template: SampleTemplate; onOpen: () => void }) => (
  <button
    type="button"
    onClick={onOpen}
    className="group relative aspect-[4/5] overflow-hidden rounded-[12px] bg-control text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <img src={mockImage(template.cover)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-slow group-hover:scale-[1.04]" />
    <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden="true" />
    <KindTag kind={template.kind} className="absolute left-3 top-3" />
    <span className="absolute inset-x-3 bottom-3">
      <span className="block text-[15px] leading-5 font-semibold text-white">{template.title}</span>
      <span className="block text-caption text-white/75">
        {template.author} · {formatUses(template.uses)} uses
      </span>
    </span>
  </button>
);

const CommunityGrid = ({
  items,
  liked,
  onLike,
}: {
  items: typeof community;
  liked: Set<number>;
  onLike: (fn: (prev: Set<number>) => Set<number>) => void;
}) => (
  <div className="columns-2 md:columns-3 xl:columns-5 gap-2 [&>*]:mb-2">
    {items.map((c, i) => {
      const isLiked = liked.has(i);
      return (
        <figure key={`${c.key}-${i}`} className="group relative break-inside-avoid overflow-hidden rounded-md bg-control">
          <img src={mockImage(c.key)} alt="" loading="lazy" className={cn("w-full object-cover", c.tall ? "aspect-[4/5]" : "aspect-square")} />
          <figcaption className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/60 to-transparent p-2 pt-8 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-normal">
            <span className="flex size-5 items-center justify-center rounded-full bg-white/90 text-[9px] font-semibold text-foreground">{c.author.charAt(0)}</span>
            <span className="flex-1 truncate text-caption text-white">{c.author}</span>
            <button
              type="button"
              aria-pressed={isLiked}
              aria-label={isLiked ? "Unlike" : "Like"}
              onClick={() =>
                onLike((prev) => {
                  const next = new Set(prev);
                  if (next.has(i)) next.delete(i);
                  else next.add(i);
                  return next;
                })
              }
              className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2 h-6 text-caption text-white backdrop-blur hover:bg-black/50"
            >
              <Heart className={cn("size-3.5", isLiked && "fill-brand text-brand")} strokeWidth={1.75} aria-hidden="true" />
              {c.likes + (isLiked ? 1 : 0)}
            </button>
          </figcaption>
        </figure>
      );
    })}
  </div>
);

const TemplateDialog = ({
  template,
  onClose,
  onUse,
}: {
  template: SampleTemplate | null;
  onClose: () => void;
  onUse: (t: SampleTemplate) => void;
}) => {
  const [selected, setSelected] = useState<MockImageKey | null>(null);
  const images = template ? [template.cover, ...(template.gallery ?? [])] : [];
  const hero = selected && images.includes(selected) ? selected : images[0];

  return (
    <Dialog
      open={!!template}
      onOpenChange={(o) => {
        if (!o) {
          setSelected(null);
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[90dvh] max-w-[860px] gap-0 overflow-y-auto overscroll-contain p-0">
        {template && (
          <div className="grid md:grid-cols-[1.1fr_1fr]">
            <div className="bg-app p-3">
              <img src={mockImage(hero)} alt="" className="aspect-square w-full rounded-md object-cover" />
              {images.length > 1 && (
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {images.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setSelected(k)}
                      aria-label="Preview image"
                      aria-pressed={hero === k}
                      className={cn("overflow-hidden rounded-md ring-offset-2 ring-offset-app transition-shadow", hero === k && "ring-2 ring-foreground")}
                    >
                      <img src={mockImage(k)} alt="" className="aspect-square w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col p-6">
              <div className="flex items-center gap-2">
                <KindTag kind={template.kind} className={template.kind === "Template" ? "bg-control" : undefined} />
                <span className="text-caption text-tertiary-foreground">by {template.author}</span>
              </div>
              <DialogTitle className="mt-3 text-heading-md text-foreground">{template.title}</DialogTitle>
              <DialogDescription className="mt-1 text-body-sm text-muted-foreground">{template.description}</DialogDescription>

              <p className="mt-6 text-overline text-muted-foreground">Prompt</p>
              <div className="mt-1.5 rounded-md bg-control p-3 text-body-md text-foreground">{template.prompt}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="meta-chip">1:1</span>
                <span className="meta-chip">2K</span>
                <span className="meta-chip">Gemini 3 Pro</span>
                <span className="meta-chip">{formatUses(template.uses)} uses</span>
              </div>

              <div className="mt-auto flex gap-2 pt-8">
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard?.writeText(template.prompt).catch(() => {});
                    toast.success("Prompt copied");
                  }}
                >
                  <Copy aria-hidden="true" />
                  Copy prompt
                </Button>
                <Button className="flex-1" onClick={() => onUse(template)}>
                  <Sparkles aria-hidden="true" />
                  Use template
                  <ArrowRight aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default Explore;
