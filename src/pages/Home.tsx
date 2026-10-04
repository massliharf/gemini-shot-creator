import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  Gem,
  LayoutGrid,
  Loader2,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SmartImage } from "@/components/SmartImage";
import { SampleChip } from "@/components/SampleNotice";
import { PackThumb } from "@/components/packs/PackThumb";
import { useHomeFeed } from "@/components/home/useHomeFeed";
import { navItems, categoryClasses, type Category } from "@/components/IconRail";
import { useCommandPalette, isMac } from "@/components/command/CommandPalette";
import { OnboardingToast } from "@/components/onboarding/OnboardingToast";
import { TemplateCard } from "@/components/explore/TemplateCard";
import { useRequireUser, displayName } from "@/hooks/useRequireUser";
import { isDemoMode } from "@/lib/demo";
import {
  mockImage,
  relativeTime,
  sampleCreations,
  sampleProjects,
  samplePromptIdeas,
  sampleTemplates,
  type MockImageKey,
} from "@/data/mock";
import { cn } from "@/lib/utils";

const BANNER_KEY = "lumra-home-banner-dismissed";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

const readFlag = (key: string) => {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};

/** Section header: title left, ghost "See all ›" right. */
const SectionHeader = ({
  title,
  badge,
  action,
  onAction,
}: {
  title: string;
  badge?: ReactNode;
  action?: string;
  onAction?: () => void;
}) => (
  <div className="flex items-center justify-between mb-3">
    <h2 className="flex items-center gap-2 text-heading-sm text-foreground">
      {title}
      {badge}
    </h2>
    {action && (
      <Button variant="ghost" size="md" onClick={onAction} className="-mr-2 text-muted-foreground hover:text-foreground">
        {action}
        <ChevronRight aria-hidden="true" />
      </Button>
    )}
  </div>
);

const Home = () => {
  const navigate = useNavigate();
  const { user, loading } = useRequireUser();
  const { open: openSearch } = useCommandPalette();
  const [bannerHidden, setBannerHidden] = useState(() => readFlag(BANNER_KEY));
  const feed = useHomeFeed(user?.id);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" role="status" aria-live="polite">
        <Loader2 className="size-5 animate-spin text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
      </div>
    );
  }

  const tools = navItems.filter((i) => i.group === "tools");
  const recent: { key: MockImageKey; prompt: string; tool: string }[] = sampleCreations
    .flatMap((c) => c.images.map((key) => ({ key, prompt: c.prompt, tool: c.tool })))
    .slice(0, 9);
  const templates = sampleTemplates.filter((t) => t.section !== "template").slice(0, 4);
  // Credits have no real source yet, so the plan/balance card only exists in the demo workspace.
  const demo = isDemoMode();
  // Real packs / generations when the user has some; otherwise the labelled samples (also the demo case).
  const recentLoading = feed.creations === null;
  const recentIsSample = feed.creations?.length === 0;
  const projectsLoading = feed.packs === null;
  const projectsIsSample = feed.packs?.length === 0;
  const packCover = (packId: string) => feed.creations?.find((c) => c.packId === packId)?.url;

  const dismissBanner = () => {
    setBannerHidden(true);
    try {
      localStorage.setItem(BANNER_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <AppLayout userEmail={user.email}>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1160px] px-4 md:px-8 pt-6 md:pt-12 pb-28">
          {/* Hero */}
          <section aria-labelledby="home-title" className="flex flex-col items-center text-center">
            <h1 id="home-title" className="text-display-lg text-foreground text-balance">
              {greeting()}, {displayName(user)} — start creating!
            </h1>
            <button
              type="button"
              onClick={openSearch}
              className="mt-6 flex w-full max-w-[640px] items-center gap-3 h-12 rounded-lg bg-card pl-4 pr-2 text-left text-body-md text-tertiary-foreground ring-1 ring-transparent hover:ring-border transition-shadow duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Search className="size-4 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
              <span className="flex-1 truncate">Search tools, templates and prompts</span>
              <kbd className="meta-chip h-6 text-micro">{isMac() ? "⌘ K" : "Ctrl K"}</kbd>
            </button>
            <div className="mt-3 flex max-w-full gap-2 overflow-x-auto no-scrollbar px-1">
              {samplePromptIdeas.slice(0, 3).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => navigate(`/text-to-image?prompt=${encodeURIComponent(p)}`)}
                  className="inline-flex shrink-0 items-center gap-1.5 h-7 rounded-full bg-control px-3 text-label-md text-muted-foreground hover:bg-control-hover hover:text-foreground transition-colors duration-fast"
                >
                  <ArrowUpRight className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                  {p}
                </button>
              ))}
            </div>
          </section>

          {/* Category grid */}
          <section aria-label="Tools" className="mt-10 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {tools.map((t) => {
              const cat = categoryClasses[(t.category ?? "image") as Category];
              return (
                <button
                  key={t.path}
                  type="button"
                  onClick={() => navigate(t.path)}
                  className="group flex flex-col items-center gap-2.5 rounded-lg px-2 py-4 hover:bg-card transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className={cn("flex size-12 items-center justify-center rounded-md transition-transform duration-fast group-hover:scale-105", cat.box)}>
                    <t.icon className={cn("size-5", cat.icon)} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span className="text-heading-sm text-foreground leading-tight text-center">{t.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={openSearch}
              className="group flex flex-col items-center gap-2.5 rounded-lg px-2 py-4 hover:bg-card transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex size-12 items-center justify-center rounded-md bg-active transition-transform duration-fast group-hover:scale-105">
                <LayoutGrid className="size-5 text-foreground" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className="text-heading-sm text-foreground leading-tight">All tools</span>
            </button>
          </section>

          {/* Banner */}
          {!bannerHidden && (
            <section aria-label="Announcement" className="mt-6 flex items-center gap-3 rounded-lg bg-card px-[18px] py-3">
              <span className="inline-flex h-5 items-center rounded-full bg-brand-soft px-2 text-micro text-brand">New</span>
              <p className="min-w-0 flex-1 text-body-sm text-foreground">
                <span className="text-label-md">Gemini 3 Pro Image is here.</span>{" "}
                <span className="text-muted-foreground">Sharper faces, consistent characters and native 4K — in every tool.</span>
              </p>
              <Button variant="ghost" size="md" className="hidden sm:inline-flex" onClick={() => navigate("/text-to-image")}>
                Try it
                <ChevronRight aria-hidden="true" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={dismissBanner} aria-label="Dismiss announcement">
                <X />
              </Button>
            </section>
          )}

          {/* Two columns */}
          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section aria-labelledby="recent-title">
              <SectionHeader
                title="Recent creations"
                badge={recentIsSample && <SampleChip />}
                action="See all"
                onAction={() => navigate("/cloud-files")}
              />
              <h2 id="recent-title" className="sr-only">Recent creations</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" aria-busy={recentLoading || undefined}>
                {recentLoading &&
                  Array.from({ length: 7 }, (_, i) => (
                    <Skeleton key={i} className={cn("rounded-md", i === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square")} />
                  ))}
                {feed.creations?.map((c, i) => {
                  const when = c.updatedAt ? relativeTime(c.updatedAt) : null;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => navigate(c.packId ? `/?pack=${encodeURIComponent(c.packId)}` : "/cloud-files")}
                      className={cn(
                        "group relative overflow-hidden rounded-md bg-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        i === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square",
                      )}
                    >
                      <SmartImage
                        src={c.url}
                        alt={when ? `Generated ${when.toLowerCase()}` : "Generated image"}
                        fit="cover"
                        loading="lazy"
                        maxRetries={1}
                        className="size-full transition-transform duration-slow group-hover:scale-[1.03]"
                      />
                      {when && (
                        <span className="absolute inset-x-0 bottom-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-2.5 pt-8 text-left text-caption text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-normal">
                          {when}
                        </span>
                      )}
                    </button>
                  );
                })}
                {recentIsSample && recent.slice(0, 7).map((r, i) => (
                  <button
                    key={`${r.key}-${i}`}
                    type="button"
                    onClick={() => navigate(`/text-to-image?prompt=${encodeURIComponent(r.prompt)}`)}
                    className={cn(
                      "group relative overflow-hidden rounded-md bg-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      i === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square",
                    )}
                  >
                    <img
                      src={mockImage(r.key)}
                      alt={r.prompt}
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-slow group-hover:scale-[1.03]"
                    />
                    <span className="absolute inset-x-0 bottom-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-2.5 pt-8 text-left text-caption text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-normal">
                      <span className="line-clamp-2">{r.prompt}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <aside className="flex flex-col gap-4">
              {/* Projects */}
              <section aria-labelledby="projects-title" className="rounded-lg bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 id="projects-title" className="flex items-center gap-2 text-heading-sm text-foreground">
                    Projects
                    {projectsIsSample && <SampleChip />}
                  </h2>
                  <Button variant="ghost" size="md" className="-mr-2 text-muted-foreground hover:text-foreground" onClick={() => navigate("/")}>
                    All projects
                    <ChevronRight aria-hidden="true" />
                  </Button>
                </div>
                <ul className="flex flex-col" aria-busy={projectsLoading || undefined}>
                  {projectsLoading &&
                    Array.from({ length: 3 }, (_, i) => (
                      <li key={i} className="flex items-center gap-3 px-2 py-2" aria-hidden="true">
                        <Skeleton className="size-8 rounded-md" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-3 w-2/3" />
                          <Skeleton className="h-2.5 w-1/3" />
                        </div>
                      </li>
                    ))}
                  {feed.packs?.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/?pack=${encodeURIComponent(p.id)}`)}
                        className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-control transition-colors duration-fast"
                      >
                        <PackThumb name={p.name} src={packCover(p.id)} className="size-8" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-label-md text-foreground">{p.name}</span>
                          <span className="block text-caption text-tertiary-foreground">
                            {p.scenes} {p.scenes === 1 ? "scene" : "scenes"}
                            {p.createdAt && ` · ${relativeTime(p.createdAt)}`}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                  {projectsIsSample && sampleProjects.map((p) => {
                    const cat = categoryClasses[p.category as Category];
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => navigate("/")}
                          className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-control transition-colors duration-fast"
                        >
                          <span className={cn("size-3 shrink-0 rounded-[3px]", cat.dot)} aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-label-md text-foreground">{p.name}</span>
                            <span className="block text-caption text-tertiary-foreground">
                              {p.items} items · {relativeTime(p.updatedAt)}
                            </span>
                          </span>
                          <span className="flex -space-x-2" aria-hidden="true">
                            {p.covers.map((c) => (
                              <img key={c} src={mockImage(c)} alt="" className="size-6 rounded-full object-cover ring-2 ring-card" />
                            ))}
                          </span>
                          {p.shared && <Users className="size-3.5 text-tertiary-foreground" strokeWidth={1.75} aria-label="Shared" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <Button variant="secondary" size="md" fullWidth className="mt-2" onClick={() => navigate("/pack-creator")}>
                  <Plus aria-hidden="true" />
                  New project
                </Button>
              </section>

              {/* Credits — sample plan/balance, demo workspace only */}
              {demo ? (
                <section aria-labelledby="credits-title" className="rounded-lg bg-card p-4">
                  <div className="flex items-center justify-between">
                    <h2 id="credits-title" className="text-overline text-muted-foreground">Credits this month</h2>
                    <span className="flex items-center gap-1.5">
                      <SampleChip />
                      <span className="inline-flex h-5 items-center rounded-full bg-control px-2 text-micro text-foreground">Pro</span>
                    </span>
                  </div>
                  <p className="mt-2 flex items-baseline gap-1">
                    <span className="text-heading-lg text-foreground tabular-nums">1,240</span>
                    <span className="text-body-sm text-tertiary-foreground">/ 2,000</span>
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-track" role="progressbar" aria-valuenow={62} aria-valuemin={0} aria-valuemax={100} aria-label="Credits used">
                    <div className="h-full w-[62%] rounded-full bg-foreground" />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-caption">
                    <span className="text-tertiary-foreground">Resets in 12 days</span>
                    <button type="button" onClick={() => navigate("/usage")} className="inline-flex items-center gap-1 text-label-md text-brand hover:underline">
                      <Gem className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                      Upgrade
                    </button>
                  </div>
                </section>
              ) : (
                <section aria-labelledby="usage-title" className="rounded-lg bg-card p-4">
                  <div className="flex items-center justify-between">
                    <h2 id="usage-title" className="text-overline text-muted-foreground">Usage & cost</h2>
                    <BarChart3 className="size-4 text-tertiary-foreground" strokeWidth={1.75} aria-hidden="true" />
                  </div>
                  <p className="mt-2 text-body-sm text-muted-foreground">Tokens, images and estimated spend for your generations.</p>
                  <Button variant="ghost" size="md" className="mt-2 -ml-2" onClick={() => navigate("/usage")}>
                    View usage
                    <ChevronRight aria-hidden="true" />
                  </Button>
                </section>
              )}
            </aside>
          </div>

          {/* Templates */}
          <section aria-labelledby="templates-title" className="mt-10">
            <SectionHeader title="Start from a template" action="Explore" onAction={() => navigate("/explore")} />
            <h2 id="templates-title" className="sr-only">Start from a template</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {templates.map((t) => (
                <TemplateCard key={t.id} template={t} onOpen={() => navigate(`/explore?template=${t.id}`)} />
              ))}
            </div>
          </section>
        </div>
      </main>
      <OnboardingToast />
    </AppLayout>
  );
};

export default Home;
