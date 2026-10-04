import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SampleNotice } from "@/components/SampleNotice";
import { SampleStyleCard } from "@/components/styles/StyleCard";
import { packTint } from "@/components/packs/packTint";
import { sampleStyles } from "@/data/mock";
import { Download, Loader2, Check, Layers, Plus, Search, SearchX } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import JSZip from "jszip";

interface PackRecord {
  id: string;
  pack_id: string;
  pack_name: string;
  pack_data: Record<string, unknown> | null;
  created_at: string;
}

type CategoryFilter = "all" | "photography" | "3d" | "art";

const CATEGORY_FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "photography", label: "Photography" },
  { value: "3d", label: "3D" },
  { value: "art", label: "Art" },
];

const GRID_CLASS = "grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(190px,1fr))] md:gap-4";

export default function Styles() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [packs, setPacks] = useState<PackRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setIsAuthenticated(true);
        setUserEmail(session.user.email || "");
        loadPacks();
      }
    });
  }, [navigate]);

  const loadPacks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("packs")
      .select("id, pack_id, pack_name, pack_data, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load packs");
    } else {
      setPacks((data as PackRecord[]) ?? []);
    }
    setLoading(false);
  };

  // pack_data is stored JSON (legacy or hand-written) — read it defensively so a malformed pack can't crash the grid.
  const getSceneCount = (packData: Record<string, unknown> | null): number => {
    return packData && Array.isArray(packData.scenes) ? packData.scenes.length : 0;
  };

  const getCategory = (packData: Record<string, unknown> | null): string => {
    const meta = packData && typeof packData === "object" ? packData.meta : undefined;
    const category = meta && typeof meta === "object" ? (meta as Record<string, unknown>).category : undefined;
    return typeof category === "string" && category.trim() ? category : "—";
  };

  const getName = (pack: PackRecord): string =>
    [pack.pack_name, pack.pack_id].find((v): v is string => typeof v === "string" && v.trim() !== "") ?? "Untitled pack";

  /** Client-side search + category filter shared by real and sample styles. */
  const matches = (name: string, cat: string) => {
    const q = query.trim().toLowerCase();
    const okQuery = !q || name.toLowerCase().includes(q);
    const okCategory = category === "all" || cat.toLowerCase() === category;
    return okQuery && okCategory;
  };

  const visiblePacks = useMemo(
    () => packs.filter((p) => matches(getName(p), getCategory(p.pack_data))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [packs, query, category],
  );
  const visibleSamples = useMemo(
    () => sampleStyles.filter((s) => matches(s.name, s.category)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, category],
  );

  const showSamples = !loading && packs.length === 0;
  const isFiltering = query.trim() !== "" || category !== "all";
  // Selection actions only ever see packs the current search/category shows — hidden picks are never downloaded.
  const visibleSelected = visiblePacks.filter((p) => selectedIds.has(p.id));
  const selectedCount = visibleSelected.length;
  const allVisibleSelected = visiblePacks.length > 0 && selectedCount === visiblePacks.length;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** Selects or clears the visible packs only; picks hidden by the filter are left alone. */
  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const p of visiblePacks) {
        if (allVisibleSelected) next.delete(p.id);
        else next.add(p.id);
      }
      return next;
    });
  };

  const downloadSinglePack = async (pack: PackRecord) => {
    setDownloading(pack.id);
    try {
      const blob = new Blob([JSON.stringify(pack.pack_data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${getName(pack)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Download failed"); }
    setDownloading(null);
  };

  const downloadSelected = async () => {
    const selectedPacks = visibleSelected;
    if (selectedPacks.length === 0) return;
    setDownloading("bulk");
    try {
      const zip = new JSZip();
      for (const pack of selectedPacks) {
        zip.file(`${getName(pack)}.json`, JSON.stringify(pack.pack_data, null, 2));
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `style-packs-${selectedPacks.length}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${selectedPacks.length} packs`);
    } catch { toast.error("Bulk download failed"); }
    setDownloading(null);
  };

  if (!isAuthenticated) return null;

  const count = showSamples ? sampleStyles.length : packs.length;
  const noResults = (showSamples ? visibleSamples.length : visiblePacks.length) === 0;

  return (
    <AppLayout userEmail={userEmail}>
      <main className="flex-1 overflow-hidden flex flex-col bg-background">
        {/* Page header — list page pattern (§5) */}
        <div className="px-4 md:px-8 pt-5 md:pt-6 pb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-baseline gap-2 min-w-0">
            <h1 className="text-heading-md text-foreground">Styles</h1>
            <span className="text-body-sm text-muted-foreground tabular-nums" aria-label={`${count} ${showSamples ? "sample styles" : "styles"}`}>
              {count}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
            {/* Search */}
            <div className="relative order-1 min-w-0 flex-1 lg:w-56 lg:flex-none">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tertiary-foreground"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search styles"
                aria-label="Search styles"
                className="pl-9"
              />
            </div>

            {/* Upload */}
            <Button variant="primary" className="order-2 h-control-lg md:h-control-md lg:order-4" onClick={() => navigate("/pack-editor")}>
              <Plus strokeWidth={1.5} aria-hidden="true" />
              Upload
            </Button>

            {/* Category filter */}
            <div className="segmented order-3 w-full sm:w-auto lg:order-2" role="group" aria-label="Filter by category">
              {CATEGORY_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={category === f.value}
                  onClick={() => setCategory(f.value)}
                  className="segmented-item flex-1 px-3 sm:flex-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Selection (real packs only) */}
            {!loading && packs.length > 0 && (
              <div className="order-4 flex items-center gap-2 lg:order-3">
                <div
                  className={cn(
                    "flex items-center gap-2 h-control-lg md:h-control-md px-3 rounded-md transition-colors duration-fast",
                    selectedCount > 0 ? "bg-active" : "bg-control",
                  )}
                >
                  <Checkbox
                    id="styles-select-all"
                    checked={allVisibleSelected}
                    onCheckedChange={toggleSelectAll}
                    disabled={visiblePacks.length === 0}
                    aria-label="Select all packs"
                  />
                  <label htmlFor="styles-select-all" className="text-label-md text-foreground cursor-pointer select-none tabular-nums whitespace-nowrap">
                    {selectedCount > 0 ? `${selectedCount} selected` : "Select all"}
                  </label>
                </div>
                {selectedCount > 0 && (
                  <Button
                    variant="outline"
                    className="h-control-lg md:h-control-md"
                    onClick={downloadSelected}
                    disabled={downloading === "bulk"}
                  >
                    {downloading === "bulk" ? (
                      <Loader2 className="animate-spin" strokeWidth={1.5} aria-hidden="true" />
                    ) : (
                      <Download strokeWidth={1.5} aria-hidden="true" />
                    )}
                    Download {selectedCount}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-8">
          {loading ? (
            <div className={GRID_CLASS} aria-busy="true" aria-label="Loading styles">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-[4/5] w-full rounded-[12px]" />
                  <Skeleton className="h-[14px] w-2/3 rounded-xs" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {showSamples && (
                <SampleNotice>
                  <span className="sm:hidden">Your styles will appear here.</span>
                  <span className="hidden sm:inline">Style packs you upload in the Pack Editor will appear here.</span>
                </SampleNotice>
              )}

              {noResults ? (
                <div className="flex flex-col items-center justify-center text-center py-16 px-4 gap-2" role="status">
                  <SearchX className="size-6 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
                  <h2 className="text-heading-md text-foreground">No styles match</h2>
                  <p className="text-body-sm text-muted-foreground">
                    {isFiltering ? "Try another search or category." : "Nothing here yet."}
                  </p>
                </div>
              ) : showSamples ? (
                <ul className={cn(GRID_CLASS, "list-none m-0 p-0")} aria-label="Sample styles">
                  {visibleSamples.map((style) => (
                    <SampleStyleCard
                      key={style.id}
                      style={style}
                      onUse={() => navigate("/pack-creator")}
                      onEdit={() => navigate("/pack-editor")}
                    />
                  ))}
                </ul>
              ) : (
                <ul className={cn(GRID_CLASS, "list-none m-0 p-0")} aria-label="Style packs">
                  {visiblePacks.map((pack) => {
                    const selected = selectedIds.has(pack.id);
                    const checkboxId = `pack-select-${pack.id}`;
                    const name = getName(pack);
                    return (
                      <li key={pack.id} className="group min-w-0">
                        {/* Cover */}
                        <label
                          htmlFor={checkboxId}
                          className={cn(
                            "relative flex aspect-[4/5] w-full cursor-pointer items-center justify-center overflow-hidden rounded-[12px] transition-[box-shadow] duration-fast",
                            packTint(name),
                            selected && "ring-2 ring-foreground/80 ring-offset-2 ring-offset-background",
                          )}
                        >
                          <span className="text-heading-xl" aria-hidden="true">{name.trim().charAt(0).toUpperCase()}</span>
                          <span className="absolute top-2 left-2 inline-flex h-5 items-center rounded-xs bg-card/90 px-1.5 text-micro text-foreground uppercase">
                            {getCategory(pack.pack_data)}
                          </span>
                          <span className="absolute bottom-2 left-2 inline-flex h-5 items-center gap-1 rounded-xs bg-card/90 px-1.5 text-caption text-foreground">
                            <Layers className="size-3" strokeWidth={1.5} aria-hidden="true" />
                            <span className="tabular-nums">{getSceneCount(pack.pack_data)} scenes</span>
                          </span>
                          <span
                            className={cn(
                              "absolute top-2 right-2 flex items-center rounded-xs bg-card/90 p-0.5 transition-opacity duration-fast",
                              selected ? "opacity-100" : "opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100",
                            )}
                          >
                            <Checkbox
                              id={checkboxId}
                              checked={selected}
                              onCheckedChange={() => toggleSelect(pack.id)}
                              aria-label={`Select ${name}`}
                            />
                          </span>
                          {selected && (
                            <span
                              className="pointer-events-none absolute bottom-2 right-2 size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                              aria-hidden="true"
                            >
                              <Check className="size-3" strokeWidth={2} />
                            </span>
                          )}
                        </label>

                        {/* Name + action row */}
                        <div className="mt-2 flex items-center justify-between gap-2 px-0.5">
                          <div className="min-w-0">
                            <span className="block text-label-md text-foreground truncate">{name}</span>
                            <span className="block text-caption text-tertiary-foreground tabular-nums">
                              {new Date(pack.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => downloadSinglePack(pack)}
                            disabled={downloading === pack.id}
                            aria-label={`Download ${name}`}
                            className="shrink-0 text-muted-foreground hover:text-foreground"
                          >
                            {downloading === pack.id ? (
                              <Loader2 className="animate-spin" strokeWidth={1.5} aria-hidden="true" />
                            ) : (
                              <Download strokeWidth={1.5} aria-hidden="true" />
                            )}
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </main>
    </AppLayout>
  );
}
