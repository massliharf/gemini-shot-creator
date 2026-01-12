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
      console.error(error);
    } else {
      setPacks(data as PackRecord[]);
    }
    setLoading(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === packs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(packs.map((p) => p.id)));
    }
  };

  const downloadSinglePack = async (pack: PackRecord) => {
    setDownloading(pack.id);
    try {
      const jsonStr = JSON.stringify(pack.pack_data, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${pack.pack_name || pack.pack_id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Downloaded!");
    } catch (err) {
      console.error(err);
      toast.error("Download failed");
    }
    setDownloading(null);
  };

  const downloadSelected = async () => {
    if (selectedIds.size === 0) return;
    setDownloading("bulk");
    try {
      const zip = new JSZip();
      const selectedPacks = packs.filter((p) => selectedIds.has(p.id));
      
      for (const pack of selectedPacks) {
        const jsonStr = JSON.stringify(pack.pack_data, null, 2);
        zip.file(`${pack.pack_name || pack.pack_id}.json`, jsonStr);
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `style-packs-${selectedIds.size}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${selectedIds.size} packs`);
    } catch (err) {
      console.error(err);
      toast.error("Bulk download failed");
    }
    setDownloading(null);
  };

  const getSceneCount = (packData: Record<string, unknown>): number => {
    if (Array.isArray(packData.scenes)) {
      return packData.scenes.length;
    }
    return 0;
  };

  const getCategory = (packData: Record<string, unknown>): string => {
    const meta = packData.meta as Record<string, unknown> | undefined;
    return (meta?.category as string) || "-";
  };

  if (!isAuthenticated) return null;

  return (
    <AppLayout userEmail={userEmail}>
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Styles</h1>
            <p className="text-sm text-muted-foreground">{packs.length} Packs</p>
          </div>
          {selectedIds.size > 0 && (
            <Button
              onClick={downloadSelected}
              disabled={downloading === "bulk"}
              className="gap-2"
            >
              {downloading === "bulk" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download {selectedIds.size} Selected
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-6 pb-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : packs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No packs yet. Generate some from Pack Creator!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.size === packs.length && packs.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Scenes</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packs.map((pack) => (
                  <TableRow key={pack.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(pack.id)}
                        onCheckedChange={() => toggleSelect(pack.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{pack.pack_name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {getCategory(pack.pack_data)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getSceneCount(pack.pack_data)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(pack.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => downloadSinglePack(pack)}
                        disabled={downloading === pack.id}
                      >
                        {downloading === pack.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
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
