import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Download,
  Trash2,
  Folder,
  Image,
  Loader2,
  RefreshCw,
  FolderOpen,
  X,
  CheckCircle,
  CheckCircle2,
  Filter,
  FilterX,
  FileJson,
  Archive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import JSZip from "jszip";
import { AppLayout } from "@/components/AppLayout";

interface PackInfo {
  id: string;
  pack_id: string;
  pack_name: string;
  pack_data?: Record<string, unknown>;
}

interface CloudFolder {
  name: string;
  files: CloudFile[];
  pack?: PackInfo;
}

interface CloudFile {
  name: string;
  path: string;
  size?: number;
}

// New state for batched export with confirmation
interface BatchExportState {
  isRunning: boolean;
  phase: "idle" | "scanning" | "downloading" | "waiting_confirm" | "deleting" | "complete";
  // Current batch info
  currentBatchNumber: number;
  currentBatchFolders: CloudFolder[];
  // Progress
  processedFoldersInBatch: number;
  totalFoldersInBatch: number;
  currentFolderName: string;
  currentBatchSize: number; // Current batch size in bytes
  // Overall
  totalBatchesCompleted: number;
  totalFoldersExported: number;
  totalBytesExported: number;
  // Download
  downloadUrl: string | null;
  downloadFilename: string;
}

// 2GB size limit per batch (browser array buffer limit is ~2GB)
const BATCH_SIZE_LIMIT = 2 * 1024 * 1024 * 1024; // 2GB in bytes

// Storage keys
const STORAGE_KEYS = {
  folders: 'cloud-files-folders',
  downloadedFolders: 'downloaded-folders', // legacy localStorage (migrated to backend)
  scrollPosition: 'cloud-files-scroll',
  expandedFolder: 'cloud-files-expanded',
  hideDownloaded: 'cloud-files-hide-downloaded',
  folderOffset: 'cloud-files-offset',
  hasMoreFolders: 'cloud-files-has-more',
};

const CloudFiles = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Restore folders from localStorage on mount
  const [folders, setFolders] = useState<CloudFolder[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.folders);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  
  // Restore expanded folder
  const [expandedFolder, setExpandedFolder] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.expandedFolder) || null;
    } catch {
      return null;
    }
  });
  
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<"download" | "delete" | null>(null);

  // Restore pagination state
  const [folderOffset, setFolderOffset] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.folderOffset);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });
  
  const [hasMoreFolders, setHasMoreFolders] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.hasMoreFolders);
      return saved === 'true';
    } catch {
      return false;
    }
  });
  
  const [loadingMore, setLoadingMore] = useState(false);

  // Downloaded folders tracking – synced with backend (downloaded_folders table)
  const [downloadedFolders, setDownloadedFolders] = useState<Set<string>>(new Set());
  const [downloadedFoldersLoaded, setDownloadedFoldersLoaded] = useState(false);

  // Restore hideDownloaded preference
  const [hideDownloaded, setHideDownloaded] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.hideDownloaded) === 'true';
    } catch {
      return false;
    }
  });
  
  // Scroll container ref for persistence
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Batch export state
  const [batchExport, setBatchExport] = useState<BatchExportState>({
    isRunning: false,
    phase: "idle",
    currentBatchNumber: 0,
    currentBatchFolders: [],
    processedFoldersInBatch: 0,
    totalFoldersInBatch: 0,
    currentFolderName: "",
    currentBatchSize: 0,
    totalBatchesCompleted: 0,
    totalFoldersExported: 0,
    totalBytesExported: 0,
    downloadUrl: null,
    downloadFilename: "",
  });

  // JSON Archive tab state
  const [activeTab, setActiveTab] = useState<string>("files");
  const [jsonArchiveLoading, setJsonArchiveLoading] = useState(false);
  const [dbPacks, setDbPacks] = useState<Array<{
    id: string;
    pack_id: string;
    pack_name: string;
    pack_data: Record<string, unknown>;
    created_at: string;
  }>>([]);
  const [selectedJsonPacks, setSelectedJsonPacks] = useState<Set<string>>(new Set());

  const cancelRef = useRef(false);
  const packMapRef = useRef<Map<string, PackInfo>>(new Map());
  const processedFolderNamesRef = useRef<Set<string>>(new Set());

  const navigate = useNavigate();

  // Check authentication
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session) {
        navigate("/auth");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Persist folders to localStorage whenever they change
  useEffect(() => {
    if (folders.length > 0) {
      localStorage.setItem(STORAGE_KEYS.folders, JSON.stringify(folders));
    }
  }, [folders]);

  // Persist pagination state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.folderOffset, folderOffset.toString());
  }, [folderOffset]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.hasMoreFolders, hasMoreFolders.toString());
  }, [hasMoreFolders]);

  // Persist expanded folder
  useEffect(() => {
    if (expandedFolder) {
      localStorage.setItem(STORAGE_KEYS.expandedFolder, expandedFolder);
    } else {
      localStorage.removeItem(STORAGE_KEYS.expandedFolder);
    }
  }, [expandedFolder]);

  // Persist hideDownloaded preference
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.hideDownloaded, hideDownloaded.toString());
  }, [hideDownloaded]);

  // Restore scroll position on mount
  useEffect(() => {
    const savedScroll = localStorage.getItem(STORAGE_KEYS.scrollPosition);
    if (savedScroll && scrollContainerRef.current) {
      // Small delay to ensure content is rendered
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = parseInt(savedScroll, 10);
        }
      }, 100);
    }
  }, []);

  // Save scroll position on scroll
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      localStorage.setItem(STORAGE_KEYS.scrollPosition, scrollContainerRef.current.scrollTop.toString());
    }
  };

  // Load downloaded folders from backend (runs once when user is available)
  useEffect(() => {
    if (!user || downloadedFoldersLoaded) return;
    const loadDownloadedFolders = async () => {
      const readLegacy = (): string[] => {
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.downloadedFolders);
          if (!raw) return [];
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return parsed.filter((v): v is string => typeof v === "string");
          }
          if (parsed && typeof parsed === "object") {
            return Object.keys(parsed as Record<string, unknown>);
          }
          return [];
        } catch {
          return [];
        }
      };

      try {
        // 1) Load current marks from backend
        const { data, error } = await supabase
          .from("downloaded_folders")
          .select("folder_name")
          .eq("user_id", user.id);
        if (error) throw error;

        const backendNames = (data || []).map((d) => d.folder_name);
        const backendSet = new Set(backendNames);

        // 2) One-time migrate legacy localStorage marks into backend
        const legacyNames = readLegacy();
        const toUpsert = legacyNames.filter((n) => !backendSet.has(n));

        if (toUpsert.length > 0) {
          const rows = toUpsert.map((folder_name) => ({
            user_id: user.id,
            folder_name,
            downloaded_at: new Date().toISOString(),
          }));
          const { error: upsertErr } = await supabase
            .from("downloaded_folders")
            .upsert(rows, { onConflict: "user_id,folder_name" });
          if (upsertErr) throw upsertErr;
          toUpsert.forEach((n) => backendSet.add(n));
        }

        setDownloadedFolders(new Set(backendSet));

        // 3) Cleanup legacy store to avoid future confusion
        try {
          localStorage.removeItem(STORAGE_KEYS.downloadedFolders);
        } catch {
          // ignore
        }
      } catch (err) {
        console.error("Failed to load downloaded folders from backend:", err);

        // Fallback: show legacy marks if backend request fails
        const legacyNames = readLegacy();
        setDownloadedFolders(new Set(legacyNames));
      }

      setDownloadedFoldersLoaded(true);
    };
    loadDownloadedFolders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, downloadedFoldersLoaded]);

  // Load cloud files and packs - only if no cached data
  useEffect(() => {
    if (!user) return;
    // If we have cached folders, don't reload automatically
    if (folders.length > 0) {
      setLoading(false);
      return;
    }
    loadCloudData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadPackMap = async () => {
    if (!user) return;
    
    const { data: packs } = await supabase
      .from("packs")
      .select("id, pack_id, pack_name, pack_data")
      .eq("user_id", user.id);

    const packMap = new Map<string, PackInfo>();
    packs?.forEach((p) =>
      packMap.set(p.pack_id, {
        id: p.id,
        pack_id: p.pack_id,
        pack_name: p.pack_name,
        pack_data: p.pack_data as Record<string, unknown>,
      })
    );
    packMapRef.current = packMap;
  };

  const loadFolderBatch = async (offset: number, limit: number = 25) => {
    const { data: list, error } = await supabase.storage
      .from("generated-images")
      .list("", {
        limit,
        offset,
        sortBy: { column: "name", order: "asc" },
      });

    if (error) throw error;

    const folderItems = (list || []).filter((i) => i.id === null);

    const cloudFolders: CloudFolder[] = [];
    for (const item of folderItems) {
      const { data: files } = await supabase.storage
        .from("generated-images")
        .list(item.name, { limit: 1000, sortBy: { column: "name", order: "asc" } });

      const cloudFiles: CloudFile[] = (files || [])
        .filter((f) => f.id !== null)
        .map((f) => ({
          name: f.name,
          path: `${item.name}/${f.name}`,
          size: f.metadata?.size,
        }));

      if (cloudFiles.length > 0) {
        cloudFolders.push({
          name: item.name,
          files: cloudFiles,
          pack: packMapRef.current.get(item.name),
        });
      }
    }

    setHasMoreFolders((list || []).length === limit);
    setFolderOffset(offset + (list || []).length);

    return cloudFolders;
  };

  const loadCloudData = async (forceRefresh = false) => {
    if (!user) return;
    setLoading(true);

    try {
      await loadPackMap();

      if (forceRefresh) {
        // Clear cached data when forcing refresh
        localStorage.removeItem(STORAGE_KEYS.folders);
        localStorage.removeItem(STORAGE_KEYS.scrollPosition);
        setFolders([]);
        setSelectedFolders(new Set());
        setExpandedFolder(null);
        setFolderOffset(0);
      }

      const firstBatch = await loadFolderBatch(0);

      firstBatch.sort((a, b) => {
        const nameA = a.pack?.pack_name || a.name;
        const nameB = b.pack?.pack_name || b.name;
        return nameA.localeCompare(nameB);
      });

      setFolders(firstBatch);
    } catch (error) {
      console.error("Error loading cloud data:", error);
      toast.error("Cloud verisi yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const loadMoreFolders = async () => {
    if (loadingMore || loading) return;
    setLoadingMore(true);
    try {
      const next = await loadFolderBatch(folderOffset);

      setFolders((prev) => {
        const merged = [...prev, ...next];
        merged.sort((a, b) => {
          const nameA = a.pack?.pack_name || a.name;
          const nameB = b.pack?.pack_name || b.name;
          return nameA.localeCompare(nameB);
        });
        return merged;
      });
    } catch (error) {
      console.error("Error loading more folders:", error);
      toast.error("Daha fazla klasör yüklenemedi");
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleSelectFolder = (folderName: string) => {
    const newSelected = new Set(selectedFolders);
    if (newSelected.has(folderName)) {
      newSelected.delete(folderName);
    } else {
      newSelected.add(folderName);
    }
    setSelectedFolders(newSelected);
  };

  const selectAll = () => {
    if (selectedFolders.size === folders.length) {
      setSelectedFolders(new Set());
    } else {
      setSelectedFolders(new Set(folders.map(f => f.name)));
    }
  };

  const downloadFolder = async (folder: CloudFolder) => {
    setDownloading(folder.name);
    try {
      const zip = new JSZip();
      const folderZip = zip.folder(folder.name);

      // Always fetch fresh pack data from database to ensure JSON is included
      let packData = folder.pack?.pack_data;
      let packName = folder.pack?.pack_name || folder.name;
      let packDbId = folder.pack?.id || "";

      // Ensure we have packDbId + packData (cache can be stale/incomplete)
      if ((!packDbId || !packData) && user) {
        const { data: packRecord } = await supabase
          .from("packs")
          .select("id, pack_id, pack_name, pack_data")
          .eq("pack_id", folder.name)
          .eq("user_id", user.id)
          .maybeSingle();

        if (packRecord) {
          packDbId = packRecord.id;
          packData = packRecord.pack_data as Record<string, unknown>;
          packName = packRecord.pack_name || folder.name;

          // Update folder in state with fresh pack data (keeps future downloads correct)
          setFolders((prev) =>
            prev.map((f) =>
              f.name === folder.name
                ? {
                    ...f,
                    pack: {
                      id: packRecord.id,
                      pack_id: packRecord.pack_id,
                      pack_name: packRecord.pack_name,
                      pack_data: packData,
                    },
                  }
                : f
            )
          );
        }
      }

      // Fallback: if pack is missing in DB, try to load the original template from storage
      // (Generator now uploads `${packId}/pack.json`.)
      if (!packData) {
        try {
          const { data: jsonBlob, error: jsonErr } = await supabase.storage
            .from("generated-images")
            .download(`${folder.name}/pack.json`);

          if (!jsonErr && jsonBlob) {
            const jsonText = await jsonBlob.text();
            packData = JSON.parse(jsonText);
            // If meta.pack_name exists, use it for nicer filenames
            const metaName = (packData as any)?.meta?.pack_name;
            if (typeof metaName === "string" && metaName.trim()) {
              packName = metaName.trim();
            }
          }
        } catch (e) {
          // ignore
        }
      }

      if (folderZip) {
        const safeBaseName = packName.replace(/[\\/\n\r\t]/g, "-").trim() || folder.name;
        const safeFolderBaseName = folder.name.replace(/[\\/\n\r\t]/g, "-").trim() || folder.name;

        if (packData) {
          // 1) The original pack template JSON (meta + global_style_anchor + scenes)
          const packJson = JSON.stringify(packData, null, 2);
          // Put it in multiple predictable places/names so the user always finds it.
          folderZip.file(`${safeBaseName}.json`, packJson);
          folderZip.file(`${safeFolderBaseName}.json`, packJson);
          zip.file(`${safeBaseName}.json`, packJson);
          zip.file(`${safeFolderBaseName}.json`, packJson);

          // 2) A generation manifest with the exact params used per image (shot_data)
          if (packDbId && user) {
            const { data: queueRows } = await supabase
              .from("generation_queue")
              .select("shot_id, status, image_path, error_message, shot_data, created_at, updated_at")
              .eq("user_id", user.id)
              .eq("pack_id", packDbId)
              .order("updated_at", { ascending: true });

            // Map storage files to shot_id if possible (scene-XX.ext)
            const fileMap = folder.files.map((f) => {
              const m = f.name.match(/scene-(\d{2})/i);
              const shot_id = m ? parseInt(m[1], 10) : null;
              return { filename: f.name, shot_id };
            });

            const manifest = {
              pack_folder: folder.name,
              pack_name: packName,
              exported_at: new Date().toISOString(),
              files: fileMap,
              generations: queueRows || [],
            };

            const manifestJson = JSON.stringify(manifest, null, 2);
            folderZip.file(`${safeBaseName}.generation.json`, manifestJson);
            folderZip.file(`${safeFolderBaseName}.generation.json`, manifestJson);
            zip.file(`${safeBaseName}.generation.json`, manifestJson);
            zip.file(`${safeFolderBaseName}.generation.json`, manifestJson);
          }
        } else {
          // Create basic metadata if no pack found
          const basicMeta = {
            folder_name: folder.name,
            file_count: folder.files.length,
            files: folder.files.map((f) => f.name),
            exported_at: new Date().toISOString(),
          };
          folderZip.file(`${folder.name}_metadata.json`, JSON.stringify(basicMeta, null, 2));
        }
      }

      for (const file of folder.files) {
        const { data, error } = await supabase.storage
          .from("generated-images")
          .download(file.path);

        if (error) throw error;
        if (data && folderZip) {
          folderZip.file(file.name, data);
        }
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${packName}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      // Mark as downloaded
      markAsDownloaded(folder.name);

      toast.success(`${packName} indirildi`);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("İndirme başarısız");
    } finally {
      setDownloading(null);
    }
  };

  const markAsDownloaded = async (folderName: string) => {
    setDownloadedFolders((prev) => {
      const next = new Set(prev);
      next.add(folderName);
      return next;
    });
    // Persist to backend
    if (user) {
      try {
        await supabase.from("downloaded_folders").upsert(
          { user_id: user.id, folder_name: folderName, downloaded_at: new Date().toISOString() },
          { onConflict: "user_id,folder_name" }
        );
      } catch (err) {
        console.error("Failed to persist downloaded folder:", err);
      }
    }
  };

  const unmarkAsDownloaded = async (folderName: string) => {
    setDownloadedFolders((prev) => {
      const next = new Set(prev);
      next.delete(folderName);
      return next;
    });
    // Delete from backend
    if (user) {
      try {
        await supabase.from("downloaded_folders").delete().eq("user_id", user.id).eq("folder_name", folderName);
      } catch (err) {
        console.error("Failed to delete downloaded folder mark:", err);
      }
    }
  };

  const clearDownloadedMarks = async () => {
    setDownloadedFolders(new Set());
    // Delete all from backend
    if (user) {
      try {
        await supabase.from("downloaded_folders").delete().eq("user_id", user.id);
      } catch (err) {
        console.error("Failed to clear downloaded folder marks:", err);
      }
    }
    toast.success("İndirildi işaretleri temizlendi");
  };

  const deleteFolder = async (folder: CloudFolder) => {
    if (!confirm(`"${folder.pack?.pack_name || folder.name}" klasörünü silmek istediğinizden emin misiniz?`)) {
      return;
    }

    setDeleting(folder.name);
    try {
      const { data, error } = await supabase.functions.invoke("delete-generated-folders", {
        body: { folderNames: [folder.name] },
      });

      if (error) throw error;

      if (!data?.ok) {
        const denied = Array.isArray(data?.denied) ? data.denied.join(", ") : "";
        const errors = data?.deleted?.[folder.name]?.errors;
        const errText = Array.isArray(errors) && errors.length ? errors.join(" | ") : "";
        throw new Error(denied ? `Silme yetkisi yok: ${denied}` : (errText || "Silme başarısız"));
      }

      setFolders((prev) => {
        const updated = prev.filter((f) => f.name !== folder.name);
        // Update localStorage cache
        localStorage.setItem(STORAGE_KEYS.folders, JSON.stringify(updated));
        return updated;
      });
      setSelectedFolders((prev) => {
        const newSet = new Set(prev);
        newSet.delete(folder.name);
        return newSet;
      });
      
      // Also remove from downloaded list if present (backend sync)
      if (downloadedFolders.has(folder.name)) {
        unmarkAsDownloaded(folder.name);
      }

      processedFolderNamesRef.current.add(folder.name);

      toast.success(`${folder.pack?.pack_name || folder.name} silindi`);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error instanceof Error ? error.message : "Silme başarısız");
    } finally {
      setDeleting(null);
    }
  };

  const handleBulkDownload = async () => {
    if (selectedFolders.size === 0) return;
    setBulkAction('download');

    try {
      const zip = new JSZip();
      const selectedFolderList = folders.filter(f => selectedFolders.has(f.name));

      for (const folder of selectedFolderList) {
        let packName = folder.pack?.pack_name || folder.name;
        let packDbId = folder.pack?.id || "";
        let packData = folder.pack?.pack_data;

        // Ensure pack is present (cached folders may not include it)
        if ((!packDbId || !packData) && user) {
          const { data: packRecord } = await supabase
            .from("packs")
            .select("id, pack_id, pack_name, pack_data")
            .eq("pack_id", folder.name)
            .eq("user_id", user.id)
            .maybeSingle();

          if (packRecord) {
            packDbId = packRecord.id;
            packName = packRecord.pack_name || folder.name;
            packData = packRecord.pack_data as Record<string, unknown>;
          }
        }

        const safeBaseName = packName.replace(/[\\/\n\r\t]/g, "-").trim() || folder.name;
        const safeFolderBaseName = folder.name.replace(/[\\/\n\r\t]/g, "-").trim() || folder.name;

        const folderZip = zip.folder(packName);

        if (packData && folderZip) {
          const packJson = JSON.stringify(packData, null, 2);
          folderZip.file(`${safeBaseName}.json`, packJson);
          folderZip.file(`${safeFolderBaseName}.json`, packJson);

          if (packDbId && user) {
            const { data: queueRows } = await supabase
              .from("generation_queue")
              .select("shot_id, status, image_path, error_message, shot_data, created_at, updated_at")
              .eq("user_id", user.id)
              .eq("pack_id", packDbId)
              .order("updated_at", { ascending: true });

            const fileMap = folder.files.map((f) => {
              const m = f.name.match(/scene-(\d{2})/i);
              const shot_id = m ? parseInt(m[1], 10) : null;
              return { filename: f.name, shot_id };
            });

            folderZip.file(
              `${safeBaseName}.generation.json`,
              JSON.stringify(
                {
                  pack_folder: folder.name,
                  pack_name: packName,
                  exported_at: new Date().toISOString(),
                  files: fileMap,
                  generations: queueRows || [],
                },
                null,
                2
              )
            );

            folderZip.file(
              `${safeFolderBaseName}.generation.json`,
              JSON.stringify(
                {
                  pack_folder: folder.name,
                  pack_name: packName,
                  exported_at: new Date().toISOString(),
                  files: fileMap,
                  generations: queueRows || [],
                },
                null,
                2
              )
            );
          }
        }
        for (const file of folder.files) {
          const { data, error } = await supabase.storage
            .from("generated-images")
            .download(file.path);

          if (error) {
            console.warn(`Skipping file ${file.path}:`, error);
            continue;
          }
          if (data && folderZip) {
            folderZip.file(file.name, data);
          }
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cloud-export-${selectedFolders.size}-folders.zip`;
      a.click();
      URL.revokeObjectURL(url);

      // Mark all downloaded folders (backend sync)
      const namesToMark = selectedFolderList.map((f) => f.name);
      setDownloadedFolders((prev) => {
        const next = new Set(prev);
        namesToMark.forEach((n) => next.add(n));
        return next;
      });

      if (user) {
        try {
          const rows = namesToMark.map((folder_name) => ({
            user_id: user.id,
            folder_name,
            downloaded_at: new Date().toISOString(),
          }));
          const { error: upsertErr } = await supabase
            .from("downloaded_folders")
            .upsert(rows, { onConflict: "user_id,folder_name" });
          if (upsertErr) throw upsertErr;
        } catch (err) {
          console.error("Failed to persist bulk downloaded folders:", err);
        }
      }

      toast.success(`${selectedFolders.size} klasör indirildi`);
    } catch (error) {
      console.error('Bulk download error:', error);
      toast.error('Toplu indirme başarısız');
    } finally {
      setBulkAction(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedFolders.size === 0) return;

    if (!confirm(`${selectedFolders.size} klasörü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!`)) {
      return;
    }

    setBulkAction("delete");

    try {
      const selectedFolderList = folders.filter((f) => selectedFolders.has(f.name));
      const folderNames = selectedFolderList.map((f) => f.name);

      const { data, error } = await supabase.functions.invoke("delete-generated-folders", {
        body: { folderNames },
      });

      if (error) throw error;

      if (!data?.ok) {
        const denied = Array.isArray(data?.denied) ? data.denied.join(", ") : "";
        throw new Error(denied ? `Silme yetkisi yok: ${denied}` : "Toplu silme tamamlanamadı");
      }

      // Update UI
      setFolders((prev) => {
        const updated = prev.filter((f) => !selectedFolders.has(f.name));
        localStorage.setItem(STORAGE_KEYS.folders, JSON.stringify(updated));
        return updated;
      });
      
      // Remove from downloaded list (backend sync)
      setDownloadedFolders((prev) => {
        const next = new Set(prev);
        folderNames.forEach((name) => next.delete(name));
        return next;
      });

      if (user) {
        try {
          await supabase
            .from("downloaded_folders")
            .delete()
            .eq("user_id", user.id)
            .in("folder_name", folderNames);
        } catch (err) {
          console.error("Failed to remove downloaded marks for deleted folders:", err);
        }
      }
      
      setSelectedFolders(new Set());

      folderNames.forEach((n) => processedFolderNamesRef.current.add(n));

      toast.success(`${selectedFolderList.length} klasör silindi`);
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast.error(error instanceof Error ? error.message : "Toplu silme başarısız");
    } finally {
      setBulkAction(null);
    }
  };

  // ============================================
  // NEW BATCH EXPORT: 25 folders -> ZIP -> Confirm -> Delete -> Next
  // ============================================

  const scanNextBatch = async (): Promise<{ folders: CloudFolder[]; totalSize: number }> => {
    // Storage list results can lag after deletes; keep an in-memory set of processed folders
    // so we never re-export the same folder again during this run.
    const collected: CloudFolder[] = [];
    let totalSize = 0;

    const pageSize = 100;
    let offset = 0;

    while (totalSize < BATCH_SIZE_LIMIT) {
      if (cancelRef.current) break;

      const { data: list, error } = await supabase.storage
        .from("generated-images")
        .list("", {
          limit: pageSize,
          offset,
          sortBy: { column: "name", order: "asc" },
        });

      if (error) throw error;

      const folderItems = (list || []).filter((i) => i.id === null);

      for (const item of folderItems) {
        if (cancelRef.current) break;
        if (processedFolderNamesRef.current.has(item.name)) continue;

        const { data: files } = await supabase.storage
          .from("generated-images")
          .list(item.name, { limit: 1000, sortBy: { column: "name", order: "asc" } });

        const cloudFiles: CloudFile[] = (files || [])
          .filter((f) => f.id !== null)
          .map((f) => ({
            name: f.name,
            path: `${item.name}/${f.name}`,
            size: f.metadata?.size,
          }));

        if (cloudFiles.length > 0) {
          // Calculate folder size
          const folderSize = cloudFiles.reduce((sum, f) => sum + (f.size || 0), 0);
          
          // Check if adding this folder would exceed the limit
          if (totalSize + folderSize > BATCH_SIZE_LIMIT && collected.length > 0) {
            // Don't add more folders, we've reached the size limit
            return { folders: collected, totalSize };
          }

          collected.push({
            name: item.name,
            files: cloudFiles,
            pack: packMapRef.current.get(item.name),
          });
          totalSize += folderSize;
        } else {
          // Folder exists but empty; consider it processed to avoid looping.
          processedFolderNamesRef.current.add(item.name);
        }

        if (totalSize >= BATCH_SIZE_LIMIT) break;
      }

      // Next page
      offset += (list || []).length;

      // No more items
      if (!list || list.length < pageSize) break;
    }

    return { folders: collected, totalSize };
  };

  const startBatchExport = async () => {
    if (!user) {
      toast.error("Kullanıcı oturumu bulunamadı");
      return;
    }

    cancelRef.current = false;

    // Load pack map first
    await loadPackMap();

    // Start the first batch
    await processNextBatch(1, 0, 0);
  };

  const processNextBatch = async (batchNumber: number, totalExportedSoFar: number, totalBytesSoFar: number) => {
    if (cancelRef.current) {
      resetBatchExport();
      return;
    }

    setBatchExport({
      isRunning: true,
      phase: "scanning",
      currentBatchNumber: batchNumber,
      currentBatchFolders: [],
      processedFoldersInBatch: 0,
      totalFoldersInBatch: 0,
      currentFolderName: "Klasörler taranıyor...",
      currentBatchSize: 0,
      totalBatchesCompleted: batchNumber - 1,
      totalFoldersExported: totalExportedSoFar,
      totalBytesExported: totalBytesSoFar,
      downloadUrl: null,
      downloadFilename: "",
    });

    try {
      // Scan for folders
      const { folders: batchFolders, totalSize: batchSize } = await scanNextBatch();
      
      if (batchFolders.length === 0) {
        // No more folders - we're done!
        setBatchExport(prev => ({
          ...prev,
          phase: "complete",
          currentFolderName: "Tüm veriler export edildi!",
        }));
        toast.success(`Toplam ${totalExportedSoFar} klasör (${formatFileSize(totalBytesSoFar)}) export edildi ve silindi!`);
        return;
      }

      setBatchExport(prev => ({
        ...prev,
        currentBatchFolders: batchFolders,
        totalFoldersInBatch: batchFolders.length,
        currentBatchSize: batchSize,
        phase: "downloading",
      }));

      // Create ZIP for this batch
      const zip = new JSZip();

      for (let i = 0; i < batchFolders.length; i++) {
        if (cancelRef.current) {
          resetBatchExport();
          return;
        }

        const folder = batchFolders[i];
        let folderName = folder.pack?.pack_name || folder.name;
        let packDbId = folder.pack?.id || "";
        let packData = folder.pack?.pack_data;

        // Fallback: fetch pack data if missing
        if ((!packDbId || !packData) && user) {
          const { data: packRecord } = await supabase
            .from("packs")
            .select("id, pack_id, pack_name, pack_data")
            .eq("pack_id", folder.name)
            .eq("user_id", user.id)
            .maybeSingle();

          if (packRecord) {
            packDbId = packRecord.id;
            folderName = packRecord.pack_name || folder.name;
            packData = packRecord.pack_data as Record<string, unknown>;
          }
        }

        const safeBaseName = folderName.replace(/[\\/\n\r\t]/g, "-").trim() || folder.name;
        const safeFolderBaseName = folder.name.replace(/[\\/\n\r\t]/g, "-").trim() || folder.name;

        setBatchExport((prev) => ({
          ...prev,
          currentFolderName: folderName,
          processedFoldersInBatch: i,
        }));

        const folderZip = zip.folder(folderName);

        // Add pack JSON + generation manifest
        if (packData && folderZip) {
          const packJson = JSON.stringify(packData, null, 2);
          folderZip.file(`${safeBaseName}.json`, packJson);
          folderZip.file(`${safeFolderBaseName}.json`, packJson);

          if (packDbId && user) {
            const { data: queueRows } = await supabase
              .from("generation_queue")
              .select("shot_id, status, image_path, error_message, shot_data, created_at, updated_at")
              .eq("user_id", user.id)
              .eq("pack_id", packDbId)
              .order("updated_at", { ascending: true });

            const fileMap = folder.files.map((f) => {
              const m = f.name.match(/scene-(\d{2})/i);
              const shot_id = m ? parseInt(m[1], 10) : null;
              return { filename: f.name, shot_id };
            });

            const manifestJson = JSON.stringify(
              {
                pack_folder: folder.name,
                pack_name: folderName,
                exported_at: new Date().toISOString(),
                files: fileMap,
                generations: queueRows || [],
              },
              null,
              2
            );

            folderZip.file(`${safeBaseName}.generation.json`, manifestJson);
            folderZip.file(`${safeFolderBaseName}.generation.json`, manifestJson);
          }
        }
        // Download all files
        for (const file of folder.files) {
          if (cancelRef.current) {
            resetBatchExport();
            return;
          }

          try {
            const { data, error } = await supabase.storage
              .from("generated-images")
              .download(file.path);

            if (!error && data && folderZip) {
              folderZip.file(file.name, data);
            }
          } catch (e) {
            console.warn(`Skipping file ${file.path}:`, e);
          }
        }
      }

      setBatchExport(prev => ({
        ...prev,
        processedFoldersInBatch: batchFolders.length,
        currentFolderName: "ZIP oluşturuluyor...",
      }));

      // Generate ZIP
      const blob = await zip.generateAsync({ 
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
      });

      const url = URL.createObjectURL(blob);
      const sizeInGB = (batchSize / (1024 * 1024 * 1024)).toFixed(2);
      const filename = `batch-${batchNumber}-${batchFolders.length}folders-${sizeInGB}GB.zip`;

      // Trigger automatic download
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();

      // Wait for confirm phase
      setBatchExport(prev => ({
        ...prev,
        phase: "waiting_confirm",
        downloadUrl: url,
        downloadFilename: filename,
        currentFolderName: "",
      }));

    } catch (error) {
      console.error("Batch export error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`Export hatası: ${errorMessage}`);
      resetBatchExport();
    }
  };

  const confirmDownloadAndDelete = async () => {
    const { currentBatchFolders, currentBatchNumber, totalFoldersExported, currentBatchSize, totalBytesExported } = batchExport;

    // Revoke the old URL
    if (batchExport.downloadUrl) {
      URL.revokeObjectURL(batchExport.downloadUrl);
    }

    setBatchExport((prev) => ({
      ...prev,
      phase: "deleting",
      currentFolderName: "Dosyalar siliniyor...",
      downloadUrl: null,
    }));

    try {
      // Delete via backend function (service role) so it *definitely* deletes even if client lacks delete permissions
      const folderNames = currentBatchFolders.map((f) => f.name);

      const { data, error } = await supabase.functions.invoke("delete-generated-folders", {
        body: { folderNames },
      });

      if (error) throw error;

      if (!data?.ok) {
        const denied = Array.isArray(data?.denied) ? data.denied.join(", ") : "";
        throw new Error(denied ? `Silme yetkisi yok: ${denied}` : "Silme işlemi tamamlanamadı");
      }

      const newTotalExported = totalFoldersExported + currentBatchFolders.length;
      const newTotalBytes = totalBytesExported + currentBatchSize;

      // Mark as processed immediately (storage list may lag after deletes)
      currentBatchFolders.forEach((f) => processedFolderNamesRef.current.add(f.name));

      // Reflect deletes in current UI list as well
      setFolders((prev) => {
        const updated = prev.filter((f) => !currentBatchFolders.some((b) => b.name === f.name));
        localStorage.setItem(STORAGE_KEYS.folders, JSON.stringify(updated));
        return updated;
      });
      setSelectedFolders((prev) => {
        const next = new Set(prev);
        currentBatchFolders.forEach((f) => next.delete(f.name));
        return next;
      });
      
      // Remove from downloaded tracking
      setDownloadedFolders(prev => {
        const next = new Set(prev);
        let changed = false;
        currentBatchFolders.forEach(f => {
          if (next.has(f.name)) {
            next.delete(f.name);
            changed = true;
          }
        });
        if (changed) {
          localStorage.setItem(STORAGE_KEYS.downloadedFolders, JSON.stringify([...next]));
        }
        return next;
      });

      toast.success(`Batch ${currentBatchNumber}: ${currentBatchFolders.length} klasör (${formatFileSize(currentBatchSize)}) silindi`);

      // Small delay then process next batch
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Process next batch
      await processNextBatch(currentBatchNumber + 1, newTotalExported, newTotalBytes);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error instanceof Error ? error.message : "Silme sırasında hata oluştu");
      resetBatchExport();
    }
  };

  const cancelBatchExport = () => {
    cancelRef.current = true;
    if (batchExport.downloadUrl) {
      URL.revokeObjectURL(batchExport.downloadUrl);
    }
    resetBatchExport();
    toast.info("Export iptal edildi");
  };

  const resetBatchExport = () => {
    processedFolderNamesRef.current = new Set();

    setBatchExport({
      isRunning: false,
      phase: "idle",
      currentBatchNumber: 0,
      currentBatchFolders: [],
      processedFoldersInBatch: 0,
      totalFoldersInBatch: 0,
      currentFolderName: "",
      currentBatchSize: 0,
      totalBatchesCompleted: 0,
      totalFoldersExported: 0,
      totalBytesExported: 0,
      downloadUrl: null,
      downloadFilename: "",
    });
    // Refresh folder list
    loadCloudData();
  };

  const closeBatchExport = () => {
    if (batchExport.downloadUrl) {
      URL.revokeObjectURL(batchExport.downloadUrl);
    }
    resetBatchExport();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getPhaseText = () => {
    switch (batchExport.phase) {
      case "scanning": return "Taranıyor...";
      case "downloading": return "İndiriliyor...";
      case "waiting_confirm": return "İndirme tamamlandı - Onay bekleniyor";
      case "deleting": return "Siliniyor...";
      case "complete": return "Tamamlandı!";
      default: return "";
    }
  };

  // ============================================
  // JSON ARCHIVE TAB FUNCTIONS
  // ============================================
  const loadDbPacks = async () => {
    if (!user) return;
    setJsonArchiveLoading(true);
    try {
      const { data, error } = await supabase
        .from("packs")
        .select("id, pack_id, pack_name, pack_data, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDbPacks((data || []) as typeof dbPacks);
    } catch (e) {
      console.error("Failed to load packs for JSON archive:", e);
      toast.error("Pack listesi yüklenemedi");
    } finally {
      setJsonArchiveLoading(false);
    }
  };

  const toggleJsonPackSelection = (packId: string) => {
    setSelectedJsonPacks((prev) => {
      const next = new Set(prev);
      if (next.has(packId)) {
        next.delete(packId);
      } else {
        next.add(packId);
      }
      return next;
    });
  };

  const selectAllJsonPacks = () => {
    if (selectedJsonPacks.size === dbPacks.length) {
      setSelectedJsonPacks(new Set());
    } else {
      setSelectedJsonPacks(new Set(dbPacks.map((p) => p.id)));
    }
  };

  const downloadSelectedJsonPacks = async () => {
    if (selectedJsonPacks.size === 0) {
      toast.error("Lütfen en az bir pack seçin");
      return;
    }

    setJsonArchiveLoading(true);
    try {
      const zip = new JSZip();
      const selectedPacks = dbPacks.filter((p) => selectedJsonPacks.has(p.id));

      for (const pack of selectedPacks) {
        const safeName = pack.pack_name.replace(/[\\/\n\r\t]/g, "-").trim() || pack.pack_id;
        const safeId = pack.pack_id.replace(/[\\/\n\r\t]/g, "-").trim();

        // Add pack JSON (template with scenes, global_style_anchor, etc.)
        zip.file(`${safeName}.json`, JSON.stringify(pack.pack_data, null, 2));
        zip.file(`${safeId}.json`, JSON.stringify(pack.pack_data, null, 2));

        // Also try to fetch generation manifest from generation_queue
        const { data: queueRows } = await supabase
          .from("generation_queue")
          .select("shot_id, status, image_path, error_message, shot_data, created_at, updated_at")
          .eq("user_id", user!.id)
          .eq("pack_id", pack.id)
          .order("updated_at", { ascending: true });

        if (queueRows && queueRows.length > 0) {
          const manifest = {
            pack_id: pack.pack_id,
            pack_name: pack.pack_name,
            db_id: pack.id,
            exported_at: new Date().toISOString(),
            generations: queueRows,
          };
          zip.file(`${safeName}.generation.json`, JSON.stringify(manifest, null, 2));
          zip.file(`${safeId}.generation.json`, JSON.stringify(manifest, null, 2));
        }
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pack-json-archive-${selectedPacks.length}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`${selectedPacks.length} pack JSON indirildi`);
    } catch (e) {
      console.error("JSON archive download error:", e);
      toast.error("JSON arşivi indirilemedi");
    } finally {
      setJsonArchiveLoading(false);
    }
  };

  const downloadAllJsonPacks = async () => {
    if (dbPacks.length === 0) {
      toast.error("İndirilecek pack bulunamadı");
      return;
    }

    setJsonArchiveLoading(true);
    try {
      const zip = new JSZip();

      for (const pack of dbPacks) {
        const safeName = pack.pack_name.replace(/[\\/\n\r\t]/g, "-").trim() || pack.pack_id;
        const safeId = pack.pack_id.replace(/[\\/\n\r\t]/g, "-").trim();

        // Add pack JSON
        zip.file(`${safeName}.json`, JSON.stringify(pack.pack_data, null, 2));
        if (safeName !== safeId) {
          zip.file(`${safeId}.json`, JSON.stringify(pack.pack_data, null, 2));
        }

        // Generation manifest
        const { data: queueRows } = await supabase
          .from("generation_queue")
          .select("shot_id, status, image_path, error_message, shot_data, created_at, updated_at")
          .eq("user_id", user!.id)
          .eq("pack_id", pack.id)
          .order("updated_at", { ascending: true });

        if (queueRows && queueRows.length > 0) {
          const manifest = {
            pack_id: pack.pack_id,
            pack_name: pack.pack_name,
            db_id: pack.id,
            exported_at: new Date().toISOString(),
            generations: queueRows,
          };
          zip.file(`${safeName}.generation.json`, JSON.stringify(manifest, null, 2));
        }
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `all-pack-jsons-${dbPacks.length}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`${dbPacks.length} pack JSON indirildi`);
    } catch (e) {
      console.error("JSON archive download error:", e);
      toast.error("JSON arşivi indirilemedi");
    } finally {
      setJsonArchiveLoading(false);
    }
  };

  // Load JSON archive data when tab changes
  useEffect(() => {
    if (activeTab === "json-archive" && dbPacks.length === 0 && user) {
      loadDbPacks();
    }
  }, [activeTab, user]);


  const totalFiles = folders.reduce((sum, f) => sum + f.files.length, 0);
  const selectedCount = selectedFolders.size;
  const downloadedCount = [...downloadedFolders].filter(name => folders.some(f => f.name === name)).length;
  
  // Filtered folders based on hideDownloaded
  const displayedFolders = hideDownloaded 
    ? folders.filter(f => !downloadedFolders.has(f.name))
    : folders;

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout userEmail={user?.email}>
      <main className="flex-1 bg-card rounded-2xl border border-border/50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-sm font-semibold">Cloud Dosya Yöneticisi</h1>
            <p className="text-[11px] text-muted-foreground">
              {folders.length} klasör, {totalFiles} dosya
              {downloadedCount > 0 && (
                <span className="ml-2 text-success">
                  • {downloadedCount} indirildi
                </span>
              )}
            </p>
          </div>

          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" onClick={() => loadCloudData(true)} disabled={loading} className="h-7 w-7 p-0 rounded-lg">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(val) => {
          setActiveTab(val);
          // Load packs when switching to json-archive tab
          if (val === "json-archive" && dbPacks.length === 0) {
            loadDbPacks();
          }
        }} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 mt-2 mb-0 w-fit flex-shrink-0">
            <TabsTrigger value="files" className="gap-1.5 text-xs">
              <Folder className="w-3.5 h-3.5" />
              Dosyalar
            </TabsTrigger>
            <TabsTrigger value="json-archive" className="gap-1.5 text-xs">
              <FileJson className="w-3.5 h-3.5" />
              Pack JSON Arşivi
            </TabsTrigger>
          </TabsList>

          {/* FILES TAB */}
          <TabsContent value="files" className="flex-1 flex flex-col overflow-hidden mt-0 data-[state=inactive]:hidden">
            {/* Action bar */}
            <div className="px-5 py-2 border-b border-border/50 flex gap-1.5 flex-shrink-0">
              <Button
                variant={hideDownloaded ? "default" : "outline"}
                size="sm"
                onClick={() => setHideDownloaded(!hideDownloaded)}
                className="gap-1 text-xs h-7 rounded-lg"
              >
                {hideDownloaded ? <FilterX className="w-3.5 h-3.5" /> : <Filter className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{hideDownloaded ? 'Tümünü Göster' : 'Gizle'}</span>
              </Button>
              
              <Button 
                variant="default" 
                size="sm" 
                onClick={startBatchExport}
                disabled={loading || batchExport.isRunning}
                className="text-xs h-7 rounded-lg"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                <span className="hidden sm:inline">Export & Sil</span>
              </Button>
            </div>

            {/* Bulk actions bar */}
            {selectedCount > 0 && (
              <div className="border-b border-border/50 bg-primary/5 px-5 py-2 flex items-center justify-between flex-shrink-0">
                <span className="text-xs font-medium">
                  {selectedCount} klasör seçildi
                </span>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkDownload}
                    disabled={bulkAction !== null}
                    className="h-7 text-xs rounded-lg"
                  >
                    {bulkAction === 'download' ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5 mr-1" />
                    )}
                    İndir
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleBulkDelete}
                    disabled={bulkAction !== null}
                    className="h-7 text-xs rounded-lg"
                  >
                    {bulkAction === 'delete' ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                    )}
                    Sil
                  </Button>
                </div>
              </div>
            )}

            {/* Folder list */}
            <div 
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-5"
            >
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : folders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Folder className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-xs">Cloud'da dosya bulunamadı</p>
                </div>
              ) : displayedFolders.length === 0 && hideDownloaded ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p>Tüm klasörler indirildi!</p>
                  <Button variant="link" onClick={() => setHideDownloaded(false)} className="mt-2">
                    Tümünü göster
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Select all */}
                  <div className="flex items-center gap-2 p-2 bg-secondary/30 rounded-lg">
                    <Checkbox
                      checked={selectedFolders.size === displayedFolders.length && displayedFolders.length > 0}
                      onCheckedChange={() => {
                        if (selectedFolders.size === displayedFolders.length) {
                          setSelectedFolders(new Set());
                        } else {
                          setSelectedFolders(new Set(displayedFolders.map(f => f.name)));
                        }
                      }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {selectedFolders.size === displayedFolders.length ? 'Tümünü kaldır' : 'Tümünü seç'}
                    </span>
                    {hideDownloaded && (
                      <Badge variant="secondary" className="ml-auto text-[10px]">
                        {folders.length - displayedFolders.length} gizli
                      </Badge>
                    )}
                  </div>

                  {displayedFolders.map(folder => {
                    const isExpanded = expandedFolder === folder.name;
                    const isSelected = selectedFolders.has(folder.name);
                    const isDownloaded = downloadedFolders.has(folder.name);
                    const displayName = folder.pack?.pack_name || folder.name;

                    return (
                      <div 
                        key={folder.name} 
                        className={`border rounded-xl bg-secondary/30 overflow-hidden ${
                          isDownloaded ? 'border-green-500/50 bg-green-500/5' : 'border-border/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 p-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectFolder(folder.name)}
                          />
                          
                          {isDownloaded && (
                            <button
                              onClick={() => unmarkAsDownloaded(folder.name)}
                              className="text-green-500 hover:text-green-600"
                              title="İndirildi - tıkla kaldır"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          
                          <button
                            className="flex-1 flex items-center gap-3 text-left hover:bg-accent/50 rounded p-1 -m-1"
                            onClick={() => setExpandedFolder(isExpanded ? null : folder.name)}
                          >
                            {isExpanded ? (
                              <FolderOpen className="w-4 h-4 text-primary" />
                            ) : (
                              <Folder className="w-4 h-4 text-muted-foreground" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{displayName}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {folder.files.length} dosya
                              </p>
                            </div>
                          </button>

                          <div className="flex gap-1">
                            {!isDownloaded && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => markAsDownloaded(folder.name)}
                                title="İndirildi olarak işaretle"
                                className="h-7 w-7 text-muted-foreground hover:text-green-500"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => downloadFolder(folder)}
                              disabled={downloading === folder.name}
                              className="h-7 w-7"
                            >
                              {downloading === folder.name ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteFolder(folder)}
                              disabled={deleting === folder.name}
                              className="h-7 w-7 text-destructive hover:text-destructive"
                            >
                              {deleting === folder.name ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-border/50 bg-background/50 p-3">
                            <ScrollArea className="max-h-48">
                              <div className="space-y-1">
                                {folder.files.map(file => (
                                  <div
                                    key={file.path}
                                    className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-accent/50"
                                  >
                                    <Image className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span className="flex-1 truncate">{file.name}</span>
                                    {file.size && (
                                      <span className="text-[10px] text-muted-foreground">
                                        {formatFileSize(file.size)}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {hasMoreFolders && (
                    <div className="flex justify-center pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadMoreFolders}
                        disabled={loadingMore}
                      >
                        {loadingMore && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Daha fazla yükle
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* JSON ARCHIVE TAB */}
          <TabsContent value="json-archive" className="flex-1 flex flex-col overflow-hidden mt-0 data-[state=inactive]:hidden">
            {/* Action bar */}
            <div className="px-4 py-2 border-b border-border/50 flex gap-2 flex-shrink-0">
              <Button
                variant="default"
                size="sm"
                onClick={downloadAllJsonPacks}
                disabled={jsonArchiveLoading || dbPacks.length === 0}
                className="text-xs h-8 gap-1"
              >
                <Archive className="w-3.5 h-3.5" />
                Tümünü İndir ({dbPacks.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadSelectedJsonPacks}
                disabled={jsonArchiveLoading || selectedJsonPacks.size === 0}
                className="text-xs h-8 gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                Seçilenleri İndir ({selectedJsonPacks.size})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadDbPacks}
                disabled={jsonArchiveLoading}
                className="h-8 w-8 p-0 ml-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${jsonArchiveLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Pack list */}
            <div className="flex-1 overflow-y-auto p-4">
              {jsonArchiveLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : dbPacks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileJson className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Veritabanında pack bulunamadı</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Select all */}
                  <div className="flex items-center gap-2 p-2 bg-secondary/30 rounded-lg">
                    <Checkbox
                      checked={selectedJsonPacks.size === dbPacks.length && dbPacks.length > 0}
                      onCheckedChange={selectAllJsonPacks}
                    />
                    <span className="text-xs text-muted-foreground">
                      {selectedJsonPacks.size === dbPacks.length ? 'Tümünü kaldır' : 'Tümünü seç'}
                    </span>
                    <Badge variant="secondary" className="ml-auto text-[10px]">
                      {dbPacks.length} pack
                    </Badge>
                  </div>

                  {dbPacks.map((pack) => {
                    const isSelected = selectedJsonPacks.has(pack.id);
                    const createdAt = new Date(pack.created_at).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });

                    return (
                      <div
                        key={pack.id}
                        className={`border rounded-xl bg-secondary/30 overflow-hidden p-3 flex items-center gap-3 ${
                          isSelected ? 'border-primary/50 bg-primary/5' : 'border-border/50'
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleJsonPackSelection(pack.id)}
                        />
                        <FileJson className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{pack.pack_name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {pack.pack_id} • {createdAt}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Batch Export Dialog */}
      <Dialog open={batchExport.isRunning} onOpenChange={(open) => {
        if (!open && batchExport.phase !== "waiting_confirm") {
          cancelBatchExport();
        }
      }}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => {
          if (batchExport.phase === "waiting_confirm") e.preventDefault();
        }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Batch Export & Sil
            </DialogTitle>
            <DialogDescription>
              Her 25 klasörde bir ZIP oluşturulur, indirmenizi bekler ve onayınız üzerine silinir.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              {batchExport.phase === "complete" ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : batchExport.phase === "waiting_confirm" ? (
                <CheckCircle className="w-5 h-5 text-primary" />
              ) : (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              )}
              <span className="text-sm font-medium">
                Batch {batchExport.currentBatchNumber} - {getPhaseText()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-secondary/50 rounded-lg p-2">
                <p className="text-muted-foreground text-xs">Bu batch</p>
                <p className="font-medium">{batchExport.totalFoldersInBatch} klasör</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-2">
                <p className="text-muted-foreground text-xs">Toplam export</p>
                <p className="font-medium">{batchExport.totalFoldersExported} klasör</p>
              </div>
            </div>

            {(batchExport.phase === "scanning" || batchExport.phase === "downloading" || batchExport.phase === "deleting") && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>{batchExport.processedFoldersInBatch} / {batchExport.totalFoldersInBatch}</span>
                  <span>
                    {batchExport.totalFoldersInBatch > 0 
                      ? Math.round((batchExport.processedFoldersInBatch / batchExport.totalFoldersInBatch) * 100) 
                      : 0}%
                  </span>
                </div>
                <Progress 
                  value={batchExport.totalFoldersInBatch > 0 
                    ? (batchExport.processedFoldersInBatch / batchExport.totalFoldersInBatch) * 100 
                    : 0} 
                  className="h-2" 
                />
              </div>
            )}

            {batchExport.currentFolderName && batchExport.phase !== "waiting_confirm" && batchExport.phase !== "complete" && (
              <div className="text-xs text-muted-foreground truncate bg-secondary/50 px-3 py-2 rounded-lg">
                {batchExport.currentFolderName}
              </div>
            )}

            {batchExport.phase === "waiting_confirm" && (
              <div className="space-y-3">
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-sm font-medium text-primary mb-2">
                    ✅ {batchExport.totalFoldersInBatch} klasör indirildi
                  </p>
                  {batchExport.downloadUrl && (
                    <Button asChild className="w-full" variant="outline" size="sm">
                      <a href={batchExport.downloadUrl} download={batchExport.downloadFilename}>
                        <Download className="w-4 h-4 mr-2" />
                        Tekrar İndir
                      </a>
                    </Button>
                  )}
                </div>

                <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-xs text-destructive-foreground mb-2">
                    ⚠️ ZIP'i indirdiğinizden emin olduktan sonra tıklayın.
                  </p>
                  <Button
                    className="w-full"
                    variant="destructive"
                    size="sm"
                    onClick={confirmDownloadAndDelete}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    İndirdim, Sil
                  </Button>
                </div>
              </div>
            )}

            {batchExport.phase === "complete" && (
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20 text-center">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="font-medium text-green-700 dark:text-green-300 text-sm">
                  Tüm veriler başarıyla export edildi!
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Toplam {batchExport.totalFoldersExported} klasör işlendi.
                </p>
                <Button className="mt-3" size="sm" onClick={closeBatchExport}>
                  Kapat
                </Button>
              </div>
            )}

            {batchExport.phase !== "complete" && batchExport.phase !== "waiting_confirm" && (
              <Button variant="outline" className="w-full" size="sm" onClick={cancelBatchExport}>
                <X className="w-4 h-4 mr-2" />
                İptal Et
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default CloudFiles;
