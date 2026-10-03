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
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
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

      const missingFiles: string[] = [];
      for (const file of folder.files) {
        try {
          const { data, error } = await supabase.storage
            .from("generated-images")
            .download(file.path);

          if (error) {
            console.warn(`Skipping file ${file.path}:`, error);
            missingFiles.push(file.name);
            continue;
          }
          if (data && folderZip) {
            folderZip.file(file.name, data);
          }
        } catch (err) {
          console.warn(`Skipping file ${file.path}:`, err);
          missingFiles.push(file.name);
        }
      }

      if (folderZip && missingFiles.length > 0) {
        folderZip.file(
          "_missing_files.txt",
          `These files could not be downloaded (orphaned in storage):\n\n${missingFiles.join("\n")}`
        );
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

      if (missingFiles.length > 0) {
        toast.success(`${packName} indirildi (${missingFiles.length} eksik dosya atlandı)`);
      } else {
        toast.success(`${packName} indirildi`);
      }
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
        <Loader2 className="size-6 animate-spin text-muted-foreground" strokeWidth={1.5} aria-label="Yükleniyor" />
      </div>
    );
  }

  return (
    <AppLayout userEmail={user?.email}>
      <main className="flex-1 min-h-0 bg-background overflow-hidden flex flex-col">
        <Tabs value={activeTab} onValueChange={(val) => {
          setActiveTab(val);
          // Load packs when switching to json-archive tab
          if (val === "json-archive" && dbPacks.length === 0) {
            loadDbPacks();
          }
        }} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Page header — list page pattern (§5): name + counts left, pill tabs + refresh right */}
          <div className="px-4 md:px-8 pt-6 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-shrink-0">
            <div className="min-w-0">
              <h1 className="text-heading-md text-foreground">Cloud dosya yöneticisi</h1>
              <p className="text-body-sm text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 tabular-nums">
                <span>
                  {folders.length} klasör, {totalFiles} dosya
                </span>
                {downloadedCount > 0 && (
                  <Badge variant="success">
                    <CheckCircle2 strokeWidth={1.5} aria-hidden="true" />
                    {downloadedCount} indirildi
                  </Badge>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 max-w-full">
              <TabsList className="w-fit max-w-full">
                <TabsTrigger value="files">
                  <Folder strokeWidth={1.5} aria-hidden="true" />
                  Dosyalar
                </TabsTrigger>
                <TabsTrigger value="json-archive">
                  <FileJson strokeWidth={1.5} aria-hidden="true" />
                  Pack JSON arşivi
                </TabsTrigger>
              </TabsList>
              <Button
                variant="outline"
                size="icon"
                onClick={() => loadCloudData(true)}
                disabled={loading}
                aria-label="Yenile"
                title="Yenile"
              >
                <RefreshCw className={loading ? "animate-spin" : ""} strokeWidth={1.5} aria-hidden="true" />
              </Button>
            </div>
          </div>

          {/* FILES TAB */}
          <TabsContent value="files" className="flex-1 min-h-0 flex flex-col overflow-hidden mt-0 data-[state=inactive]:hidden">
            {/* Toolbar: outline filter + single black primary action */}
            <div className="px-4 md:px-8 pb-4 flex items-center gap-2 flex-wrap flex-shrink-0" role="toolbar" aria-label="Dosya araçları">
              <Button
                variant={hideDownloaded ? "secondary" : "outline"}
                onClick={() => setHideDownloaded(!hideDownloaded)}
                aria-pressed={hideDownloaded}
              >
                {hideDownloaded ? (
                  <FilterX strokeWidth={1.5} aria-hidden="true" />
                ) : (
                  <Filter strokeWidth={1.5} aria-hidden="true" />
                )}
                <span>{hideDownloaded ? 'Tümünü göster' : 'İndirilenleri gizle'}</span>
              </Button>

              <Button
                variant="primary"
                onClick={startBatchExport}
                disabled={loading || batchExport.isRunning}
                className="ml-auto"
              >
                <Download strokeWidth={1.5} aria-hidden="true" />
                <span>Export & sil</span>
              </Button>
            </div>

            {/* Contextual selection bar */}
            {selectedCount > 0 && (
              <div
                role="region"
                aria-live="polite"
                aria-label="Seçim işlemleri"
                className="mx-4 md:mx-8 mb-4 rounded-lg bg-app px-4 py-2 flex items-center justify-between gap-3 flex-shrink-0"
              >
                <span className="text-label-md text-foreground tabular-nums">
                  {selectedCount} klasör seçildi
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleBulkDownload}
                    disabled={bulkAction !== null}
                  >
                    {bulkAction === 'download' ? (
                      <Loader2 className="animate-spin" strokeWidth={1.5} aria-hidden="true" />
                    ) : (
                      <Download strokeWidth={1.5} aria-hidden="true" />
                    )}
                    İndir
                  </Button>
                  <Button
                    variant="danger-outline"
                    onClick={handleBulkDelete}
                    disabled={bulkAction !== null}
                  >
                    {bulkAction === 'delete' ? (
                      <Loader2 className="animate-spin" strokeWidth={1.5} aria-hidden="true" />
                    ) : (
                      <Trash2 strokeWidth={1.5} aria-hidden="true" />
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
              className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 pb-8"
            >
              {loading ? (
                <div className="space-y-2" aria-busy="true" aria-label="Klasörler yükleniyor">
                  <Skeleton className="h-control-md w-full rounded-md" />
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 min-h-[56px] md:min-h-12 px-3 rounded-lg bg-card">
                      <Skeleton className="size-4 rounded-xs" />
                      <Skeleton className="size-5 rounded-xs" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-1/2 rounded-xs" />
                        <Skeleton className="h-2.5 w-20 rounded-xs" />
                      </div>
                      <Skeleton className="h-7 w-24 rounded-md" />
                    </div>
                  ))}
                </div>
              ) : folders.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-20 px-4 gap-2">
                  <Folder className="size-6 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
                  <h2 className="text-heading-md text-foreground">Cloud'da dosya bulunamadı</h2>
                  <p className="text-body-sm text-muted-foreground">
                    Üretilen görseller burada klasörler halinde listelenir. Yeni görseller ürettikten sonra yenileyin.
                  </p>
                </div>
              ) : displayedFolders.length === 0 && hideDownloaded ? (
                <div className="flex flex-col items-center justify-center text-center py-20 px-4 gap-2">
                  <CheckCircle2 className="size-6 text-success" strokeWidth={1.5} aria-hidden="true" />
                  <h2 className="text-heading-md text-foreground">Tüm klasörler indirildi!</h2>
                  <p className="text-body-sm text-muted-foreground">
                    İndirilen klasörler filtre nedeniyle gizleniyor.
                  </p>
                  <Button variant="outline" onClick={() => setHideDownloaded(false)} className="mt-2">
                    Tümünü göster
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Select all */}
                  <div className="flex items-center gap-3 min-h-control-md px-3 rounded-md bg-control">
                    <Checkbox
                      id="cloud-select-all"
                      checked={selectedFolders.size === displayedFolders.length && displayedFolders.length > 0}
                      onCheckedChange={() => {
                        if (selectedFolders.size === displayedFolders.length) {
                          setSelectedFolders(new Set());
                        } else {
                          setSelectedFolders(new Set(displayedFolders.map(f => f.name)));
                        }
                      }}
                      aria-label="Tüm klasörleri seç"
                    />
                    <label htmlFor="cloud-select-all" className="text-label-md text-muted-foreground cursor-pointer select-none">
                      {selectedFolders.size === displayedFolders.length ? 'Tümünü kaldır' : 'Tümünü seç'}
                    </label>
                    {hideDownloaded && (
                      <Badge variant="neutral" className="ml-auto tabular-nums">
                        <FilterX strokeWidth={1.5} aria-hidden="true" />
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
                        aria-selected={isSelected}
                        className={`group rounded-lg bg-card overflow-hidden transition-[box-shadow,background-color] duration-fast ${
                          isSelected ? 'ring-1 ring-foreground/80' : 'hover:bg-control/40'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-h-[56px] md:min-h-12 px-3 py-2">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectFolder(folder.name)}
                            aria-label={`${displayName} klasörünü seç`}
                          />

                          <button
                            type="button"
                            className="flex-1 min-w-0 flex items-center gap-3 text-left rounded-md px-2 py-1.5 -mx-2 hover:bg-control transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            onClick={() => setExpandedFolder(isExpanded ? null : folder.name)}
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? (
                              <FolderOpen className="size-5 text-foreground shrink-0" strokeWidth={1.5} aria-hidden="true" />
                            ) : (
                              <Folder className="size-5 text-muted-foreground shrink-0" strokeWidth={1.5} aria-hidden="true" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-label-md text-foreground truncate">{displayName}</p>
                              <p className="text-caption text-muted-foreground tabular-nums">
                                {folder.files.length} dosya
                              </p>
                            </div>
                          </button>

                          {isDownloaded && (
                            <button
                              type="button"
                              onClick={() => unmarkAsDownloaded(folder.name)}
                              className="inline-flex items-center gap-1 h-6 px-2 rounded-xs bg-success-bg text-success-text text-caption whitespace-nowrap shrink-0 transition-colors duration-fast hover:bg-control focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              title="İndirildi - tıkla kaldır"
                              aria-label="İndirildi işaretini kaldır"
                            >
                              <CheckCircle2 className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
                              <span className="hidden sm:inline">İndirildi</span>
                            </button>
                          )}

                          <div className="flex gap-1 shrink-0">
                            {!isDownloaded && (
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => markAsDownloaded(folder.name)}
                                title="İndirildi olarak işaretle"
                                aria-label="İndirildi olarak işaretle"
                                className="text-muted-foreground hover:text-success"
                              >
                                <CheckCircle2 strokeWidth={1.5} aria-hidden="true" />
                              </Button>
                            )}
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => downloadFolder(folder)}
                              disabled={downloading === folder.name}
                              aria-label={`${displayName} klasörünü indir`}
                              title="İndir"
                            >
                              {downloading === folder.name ? (
                                <Loader2 className="animate-spin" strokeWidth={1.5} aria-hidden="true" />
                              ) : (
                                <Download strokeWidth={1.5} aria-hidden="true" />
                              )}
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => deleteFolder(folder)}
                              disabled={deleting === folder.name}
                              aria-label={`${displayName} klasörünü sil`}
                              title="Sil"
                              className="text-muted-foreground hover:text-danger-text hover:bg-danger-bg"
                            >
                              {deleting === folder.name ? (
                                <Loader2 className="animate-spin" strokeWidth={1.5} aria-hidden="true" />
                              ) : (
                                <Trash2 strokeWidth={1.5} aria-hidden="true" />
                              )}
                            </Button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-2 pb-2">
                            <div className="bg-app rounded-lg p-4">
                              <ScrollArea className="max-h-64">
                                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 list-none m-0 p-0" aria-label={`${displayName} dosyaları`}>
                                  {folder.files.map(file => (
                                    <li
                                      key={file.path}
                                      className="flex items-center gap-2 min-h-touch md:min-h-10 px-3 py-2 rounded-md bg-card text-sm hover:bg-control-hover transition-colors duration-fast"
                                    >
                                      <Image className="size-4 text-muted-foreground shrink-0" strokeWidth={1.5} aria-hidden="true" />
                                      <span className="flex-1 min-w-0 truncate text-label-md text-foreground">{file.name}</span>
                                      {file.size && (
                                        <span className="text-caption text-tertiary-foreground tabular-nums shrink-0">
                                          {formatFileSize(file.size)}
                                        </span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </ScrollArea>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {hasMoreFolders && (
                    <div className="flex justify-center pt-4">
                      <Button
                        variant="outline"
                        onClick={loadMoreFolders}
                        disabled={loadingMore}
                      >
                        {loadingMore && <Loader2 className="animate-spin" strokeWidth={1.5} aria-hidden="true" />}
                        Daha fazla yükle
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* JSON ARCHIVE TAB */}
          <TabsContent value="json-archive" className="flex-1 min-h-0 flex flex-col overflow-hidden mt-0 data-[state=inactive]:hidden">
            {/* Toolbar */}
            <div className="px-4 md:px-8 pb-4 flex items-center gap-2 flex-wrap flex-shrink-0" role="toolbar" aria-label="JSON arşivi araçları">
              <Button
                variant="outline"
                onClick={downloadSelectedJsonPacks}
                disabled={jsonArchiveLoading || selectedJsonPacks.size === 0}
                className="tabular-nums"
              >
                <Download strokeWidth={1.5} aria-hidden="true" />
                Seçilenleri indir ({selectedJsonPacks.size})
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={loadDbPacks}
                disabled={jsonArchiveLoading}
                aria-label="Pack listesini yenile"
                title="Pack listesini yenile"
              >
                <RefreshCw className={jsonArchiveLoading ? 'animate-spin' : ''} strokeWidth={1.5} aria-hidden="true" />
              </Button>
              <Button
                variant="primary"
                onClick={downloadAllJsonPacks}
                disabled={jsonArchiveLoading || dbPacks.length === 0}
                className="tabular-nums ml-auto"
              >
                <Archive strokeWidth={1.5} aria-hidden="true" />
                Tümünü indir ({dbPacks.length})
              </Button>
            </div>

            {/* Pack list */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 pb-8">
              {jsonArchiveLoading ? (
                <div className="space-y-2" aria-busy="true" aria-label="Pack listesi yükleniyor">
                  <Skeleton className="h-control-md w-full rounded-md" />
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 min-h-[56px] md:min-h-12 px-3 rounded-lg bg-card">
                      <Skeleton className="size-4 rounded-xs" />
                      <Skeleton className="size-5 rounded-xs" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-1/2 rounded-xs" />
                        <Skeleton className="h-2.5 w-40 rounded-xs" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : dbPacks.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-20 px-4 gap-2">
                  <FileJson className="size-6 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
                  <h2 className="text-heading-md text-foreground">Veritabanında pack bulunamadı</h2>
                  <p className="text-body-sm text-muted-foreground">
                    Pack Editor ile yüklediğiniz pack'lerin JSON'ları burada arşivlenir.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Select all */}
                  <div className="flex items-center gap-3 min-h-control-md px-3 rounded-md bg-control">
                    <Checkbox
                      id="json-select-all"
                      checked={selectedJsonPacks.size === dbPacks.length && dbPacks.length > 0}
                      onCheckedChange={selectAllJsonPacks}
                      aria-label="Tüm pack'leri seç"
                    />
                    <label htmlFor="json-select-all" className="text-label-md text-muted-foreground cursor-pointer select-none">
                      {selectedJsonPacks.size === dbPacks.length ? 'Tümünü kaldır' : 'Tümünü seç'}
                    </label>
                    <Badge variant="neutral" className="ml-auto tabular-nums">
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
                        aria-selected={isSelected}
                        className={`rounded-lg bg-card min-h-[56px] md:min-h-12 px-3 py-2 flex items-center gap-3 transition-[box-shadow,background-color] duration-fast ${
                          isSelected ? 'ring-1 ring-foreground/80' : 'hover:bg-control/40'
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleJsonPackSelection(pack.id)}
                          aria-label={`${pack.pack_name} pack'ini seç`}
                        />
                        <FileJson className="size-5 text-muted-foreground shrink-0" strokeWidth={1.5} aria-hidden="true" />
                        <div className="flex-1 min-w-0">
                          <p className="text-label-md text-foreground truncate">{pack.pack_name}</p>
                          <p className="text-caption text-muted-foreground truncate tabular-nums">
                            {pack.pack_id} • {createdAt}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="size-4 text-foreground shrink-0" strokeWidth={1.5} aria-hidden="true" />
                        )}
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
            <DialogTitle className="text-heading-md flex items-center gap-2">
              <Download className="size-5 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
              Batch export & sil
            </DialogTitle>
            <DialogDescription className="text-body-sm text-muted-foreground">
              Her 25 klasörde bir ZIP oluşturulur, indirmenizi bekler ve onayınız üzerine silinir.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="flex items-center gap-3" role="status" aria-live="polite">
              {batchExport.phase === "complete" ? (
                <CheckCircle className="size-5 text-success shrink-0" strokeWidth={1.5} aria-hidden="true" />
              ) : batchExport.phase === "waiting_confirm" ? (
                <CheckCircle className="size-5 text-foreground shrink-0" strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <Loader2 className="size-5 animate-spin text-muted-foreground shrink-0" strokeWidth={1.5} aria-hidden="true" />
              )}
              <span className="text-label-md text-foreground tabular-nums">
                Batch {batchExport.currentBatchNumber} - {getPhaseText()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-app rounded-lg p-4">
                <p className="text-overline text-muted-foreground">Bu batch</p>
                <p className="text-heading-md text-foreground tabular-nums">{batchExport.totalFoldersInBatch} klasör</p>
              </div>
              <div className="bg-app rounded-lg p-4">
                <p className="text-overline text-muted-foreground">Toplam export</p>
                <p className="text-heading-md text-foreground tabular-nums">{batchExport.totalFoldersExported} klasör</p>
              </div>
            </div>

            {(batchExport.phase === "scanning" || batchExport.phase === "downloading" || batchExport.phase === "deleting") && (
              <div className="space-y-2">
                <div className="flex justify-between text-caption text-muted-foreground tabular-nums">
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
                  className="h-1.5"
                  aria-label="Batch ilerlemesi"
                />
              </div>
            )}

            {batchExport.currentFolderName && batchExport.phase !== "waiting_confirm" && batchExport.phase !== "complete" && (
              <div className="text-code text-muted-foreground truncate bg-control px-3 py-2 rounded-md">
                {batchExport.currentFolderName}
              </div>
            )}

            {batchExport.phase === "waiting_confirm" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-label-md text-foreground flex items-center gap-2 tabular-nums">
                    <CheckCircle2 className="size-4 shrink-0 text-success" strokeWidth={1.5} aria-hidden="true" />
                    {batchExport.totalFoldersInBatch} klasör indirildi
                  </p>
                  {batchExport.downloadUrl && (
                    <Button asChild className="w-full" variant="outline">
                      <a href={batchExport.downloadUrl} download={batchExport.downloadFilename}>
                        <Download strokeWidth={1.5} aria-hidden="true" />
                        Tekrar indir
                      </a>
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-caption text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="size-4 shrink-0 text-warning" strokeWidth={1.5} aria-hidden="true" />
                    ZIP'i indirdiğinizden emin olduktan sonra tıklayın.
                  </p>
                  <Button
                    className="w-full"
                    variant="danger"
                    onClick={confirmDownloadAndDelete}
                  >
                    <Trash2 strokeWidth={1.5} aria-hidden="true" />
                    İndirdim, sil
                  </Button>
                </div>
              </div>
            )}

            {batchExport.phase === "complete" && (
              <div className="flex flex-col items-center text-center gap-1 pt-2">
                <CheckCircle className="size-6 text-success mb-1" strokeWidth={1.5} aria-hidden="true" />
                <p className="text-label-md text-foreground">
                  Tüm veriler başarıyla export edildi!
                </p>
                <p className="text-caption text-muted-foreground tabular-nums">
                  Toplam {batchExport.totalFoldersExported} klasör işlendi.
                </p>
                <Button className="mt-3" variant="primary" onClick={closeBatchExport}>
                  Kapat
                </Button>
              </div>
            )}

            {batchExport.phase !== "complete" && batchExport.phase !== "waiting_confirm" && (
              <Button variant="outline" className="w-full" onClick={cancelBatchExport}>
                <X strokeWidth={1.5} aria-hidden="true" />
                İptal et
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default CloudFiles;

// TODO(magnific): deleteFolder/handleBulkDelete use window.confirm(); replacing with AlertDialog (danger) requires new open-state logic.
// TODO(magnific): No search/sort state exists in this page, so the header has no search Input; the only filter is the "hide downloaded" outline toggle.
// TODO(magnific): Files have no public URL in state, so file cards show icon + name instead of image thumbnails with aspect-ratio.
