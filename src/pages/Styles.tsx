import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold">Styles</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{packs.length} packs</p>
          </div>
          {selectedIds.size > 0 && (
            <Button
              onClick={downloadSelected}
              disabled={downloading === "bulk"}
              size="sm"
              className="h-8 rounded-lg text-xs gap-1.5"
            >
              {downloading === "bulk" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Download {selectedIds.size}
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : packs.length === 0 ? (
            <div className="text-center py-20 text-sm text-muted-foreground">
              No packs yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedIds.size === packs.length && packs.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="text-xs font-medium">Name</TableHead>
                  <TableHead className="text-xs font-medium">Category</TableHead>
                  <TableHead className="text-xs font-medium text-center">Scenes</TableHead>
                  <TableHead className="text-xs font-medium">Created</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packs.map((pack) => (
                  <TableRow key={pack.id} className="border-border/30 hover:bg-accent/50">
                    <TableCell className="py-3">
                      <Checkbox
                        checked={selectedIds.has(pack.id)}
                        onCheckedChange={() => toggleSelect(pack.id)}
                      />
                    </TableCell>
                    <TableCell className="text-sm font-medium py-3">{pack.pack_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground py-3">
                      {getCategory(pack.pack_data)}
                    </TableCell>
                    <TableCell className="text-sm text-center py-3">
                      {getSceneCount(pack.pack_data)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground py-3">
                      {new Date(pack.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="py-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-md"
                        onClick={() => downloadSinglePack(pack)}
                        disabled={downloading === pack.id}
                      >
                        {downloading === pack.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </main>
    </AppLayout>
  );
}
