import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Loader2, Check, Layers, Palette } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import JSZip from "jszip";

interface PackRecord {
  id: string;
  pack_id: string;
  pack_name: string;
  pack_data: Record<string, unknown>;
  created_at: string;
}

export default function Styles() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [packs, setPacks] = useState<PackRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<string | null>(null);

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
      setPacks(data as PackRecord[]);
    }
    setLoading(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.size === packs.length ? new Set() : new Set(packs.map((p) => p.id)));
  };

  const downloadSinglePack = async (pack: PackRecord) => {
    setDownloading(pack.id);
    try {
      const blob = new Blob([JSON.stringify(pack.pack_data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${pack.pack_name || pack.pack_id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Download failed"); }
    setDownloading(null);
  };

  const downloadSelected = async () => {
    if (selectedIds.size === 0) return;
    setDownloading("bulk");
    try {
      const zip = new JSZip();
      const selectedPacks = packs.filter((p) => selectedIds.has(p.id));
      for (const pack of selectedPacks) {
        zip.file(`${pack.pack_name || pack.pack_id}.json`, JSON.stringify(pack.pack_data, null, 2));
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `style-packs-${selectedIds.size}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${selectedIds.size} packs`);
    } catch { toast.error("Bulk download failed"); }
    setDownloading(null);
  };

  const getSceneCount = (packData: Record<string, unknown>): number => {
    return Array.isArray(packData.scenes) ? packData.scenes.length : 0;
  };

  const getCategory = (packData: Record<string, unknown>): string => {
    const meta = packData.meta as Record<string, unknown> | undefined;
    return (meta?.category as string) || "—";
  };

  if (!isAuthenticated) return null;

  return (
    <AppLayout userEmail={userEmail}>
      <main className="flex-1 overflow-hidden flex flex-col bg-background">
        {/* Page header — list page pattern (§5) */}
        <div className="px-4 md:px-8 pt-6 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-heading-md text-foreground">Styles</h1>
            <p className="text-body-sm text-muted-foreground tabular-nums">{packs.length} packs</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {/* Select all / selection count */}
            {!loading && packs.length > 0 && (
              <div
                className={cn(
                  "flex items-center gap-2 h-control-md px-3 rounded-md transition-colors duration-fast",
                  selectedIds.size > 0 ? "bg-active" : "bg-control",
                )}
              >
                <Checkbox
                  id="styles-select-all"
                  checked={selectedIds.size === packs.length && packs.length > 0}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all packs"
                />
                <label htmlFor="styles-select-all" className="text-label-md text-foreground cursor-pointer select-none tabular-nums">
                  {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
                </label>
              </div>
            )}
            {selectedIds.size > 0 && (
              <Button
                variant="primary"
                onClick={downloadSelected}
                disabled={downloading === "bulk"}
              >
                {downloading === "bulk" ? (
                  <Loader2 className="animate-spin" strokeWidth={1.5} aria-hidden="true" />
                ) : (
                  <Download strokeWidth={1.5} aria-hidden="true" />
                )}
                Download {selectedIds.size}
              </Button>
            )}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-8">
          {loading ? (
            <div
              className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-4"
              aria-busy="true"
              aria-label="Loading packs"
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-[12px] bg-card p-2 space-y-2">
                  <Skeleton className="aspect-[4/3] w-full rounded-[12px]" />
                  <div className="flex items-center justify-between gap-2 px-1 pb-1">
                    <Skeleton className="h-[18px] w-2/3 rounded-xs" />
                    <Skeleton className="size-7 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : packs.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-20 px-4 gap-2">
              <Palette className="size-6 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
              <h2 className="text-heading-md text-foreground">No style packs yet</h2>
              <p className="text-body-sm text-muted-foreground">
                Style packs you upload in the Pack Editor will appear here, ready to select and download.
              </p>
            </div>
          ) : (
            <ul
              className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-4 list-none m-0 p-0"
              aria-label="Style packs"
            >
              {packs.map((pack) => {
                const selected = selectedIds.has(pack.id);
                const checkboxId = `pack-select-${pack.id}`;
                return (
                  <li
                    key={pack.id}
                    aria-selected={selected}
                    className={cn(
                      "group relative flex flex-col rounded-[12px] bg-card text-card-foreground p-2 transition-[box-shadow,background-color] duration-fast",
                      selected && "ring-1 ring-foreground/80",
                    )}
                  >
                    {/* Cover */}
                    <label
                      htmlFor={checkboxId}
                      className={cn(
                        "relative flex aspect-[4/3] w-full items-center justify-center rounded-[12px] cursor-pointer transition-colors duration-fast",
                        selected ? "bg-active" : "bg-app group-hover:bg-control-hover",
                      )}
                    >
                      <Palette className="size-6 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
                      <span className="absolute top-2 left-2 text-overline text-muted-foreground truncate max-w-[70%]">
                        {getCategory(pack.pack_data)}
                      </span>
                      <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 text-caption text-muted-foreground">
                        <Layers className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
                        <span className="tabular-nums">{getSceneCount(pack.pack_data)} scenes</span>
                      </span>
                      <span
                        className={cn(
                          "absolute top-2 right-2 flex items-center transition-opacity duration-fast",
                          selected ? "opacity-100" : "opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100",
                        )}
                      >
                        <Checkbox
                          id={checkboxId}
                          checked={selected}
                          onCheckedChange={() => toggleSelect(pack.id)}
                          aria-label={`Select ${pack.pack_name}`}
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
                    <div className="mt-2 flex items-center justify-between gap-2 px-1 pb-1">
                      <div className="min-w-0">
                        <span className="block text-label-md text-foreground truncate">{pack.pack_name}</span>
                        <span className="block text-caption text-tertiary-foreground tabular-nums">
                          {new Date(pack.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => downloadSinglePack(pack)}
                        disabled={downloading === pack.id}
                        aria-label={`Download ${pack.pack_name}`}
                        className="shrink-0"
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
      </main>
    </AppLayout>
  );
}

// TODO(magnific): Empty state has no primary action because there is no "open Pack Editor" handler in this file; wiring a navigate("/pack-editor") CTA would be a logic change.
// TODO(magnific): Spec asks for a `.segmented` filter in the header; Styles has no filter state, so none was added (no new state allowed).
