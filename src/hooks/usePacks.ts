import { useState, useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import {
  PackFile,
  SceneWithStatus,
  SceneStatus,
  getPackId,
  getPackName,
  hasScenes,
  getScenes,
} from "@/types/pack";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PackData {
  pack: PackFile;
  packId: string;
  scenes: SceneWithStatus[];
  isGenerating: boolean;
  progress: number;
}

export interface PackInfo {
  pack: PackFile;
  packId: string;
  totalShots: number;
  completedShots: number;
  failedShots: number;
  generatingShots: number;
  thumbnailUrl?: string;
}

type PacksLoadResult = {
  uploadedCount: number;
  failed: Array<{ index: number; message: string }>;
};

export const normalizeSceneId = (id: string | number | undefined): number => {
  if (id === undefined) return 0;
  return typeof id === "string" ? parseInt(id, 10) : id;
};

type QueueRow = {
  pack_id: string | null;
  shot_id: number;
  status: string;
  image_path: string | null;
  error_message: string | null;
  updated_at: string | null;
};

const STALE_GENERATING_MS = 20 * 60 * 1000; // 20 minutes

const getSceneStatusFromRow = (row?: QueueRow): { status: SceneStatus; error?: string } => {
  const status = row?.status;

  if (status === "success") return { status: "success" };
  if (status === "error") return { status: "error", error: row?.error_message || "Generation failed" };

  // "queued" rows mean the client created queue items but generation did not actually run
  // (e.g. user closed the app). Treat as idle to avoid "stuck generating" UI.
  if (status === "queued") return { status: "idle" };

  if (status === "generating") {
    const updatedAt = row?.updated_at ? new Date(row.updated_at).getTime() : null;
    const isStale = updatedAt ? Date.now() - updatedAt > STALE_GENERATING_MS : false;
    if (isStale) {
      return { status: "error", error: "Generation timed out (stuck). Please retry." };
    }
    return { status: "generating" };
  }

  return { status: "idle" };
};


// Convert scenes to SceneWithStatus array
const scenesToArray = (packFile: PackFile): { id: string; title: string; prompt: string }[] => {
  const scenes = getScenes(packFile);
  if (!scenes || !Array.isArray(scenes)) return [];

  return scenes.map((scene) => ({
    id: String(scene.id),
    title: `Scene ${scene.id}`,
    prompt: scene.prompt || "",
  }));
};

const mergeQueueRowsIntoScenes = (packFile: PackFile, rows: QueueRow[] | undefined): SceneWithStatus[] => {
  const shotResults = new Map<number, QueueRow>();
  if (rows && rows.length > 0) {
    // CRITICAL: Process ALL rows to find the best result for each shot
    // Priority: success with image_path > generating > queued > success without path > error
    for (const q of rows) {
      const existing = shotResults.get(q.shot_id);
      
      // Score function: higher = better
      const getScore = (row: QueueRow): number => {
        if (row.status === "success" && row.image_path) return 100;
        if (row.status === "generating") return 50;
        if (row.status === "queued") return 40;
        if (row.status === "success" && !row.image_path) return 30;
        if (row.status === "error") return 10;
        return 0;
      };
      
      if (!existing) {
        shotResults.set(q.shot_id, q);
        continue;
      }
      
      const existingScore = getScore(existing);
      const newScore = getScore(q);
      
      // Always prefer higher score, or newer if same score
      if (newScore > existingScore) {
        shotResults.set(q.shot_id, q);
      }
    }
  }

  return scenesToArray(packFile).map((scene) => {
    const sceneIdNum = normalizeSceneId(scene.id);
    const result = shotResults.get(sceneIdNum);
    const { status: sceneStatus, error } = getSceneStatusFromRow(result);

    if (sceneStatus === "success" && result?.image_path) {
      const {
        data: { publicUrl },
      } = supabase.storage.from("generated-images").getPublicUrl(result.image_path);

      // Add cache-busting timestamp to prevent stale images
      const urlWithCacheBust = `${publicUrl}?t=${new Date(result.updated_at || Date.now()).getTime()}`;
      return { ...scene, status: "success" as SceneStatus, imageUrl: urlWithCacheBust };
    }

    // If status is success but no image_path yet, show as generating (image upload in progress)
    if (sceneStatus === "success" && !result?.image_path) {
      return { ...scene, status: "generating" as SceneStatus };
    }

    if (sceneStatus === "error") {
      return {
        ...scene,
        status: "error" as SceneStatus,
        error: error || "Generation failed",
      };
    }

    if (sceneStatus === "generating") {
      return { ...scene, status: "generating" as SceneStatus };
    }

    return { ...scene, status: "idle" as SceneStatus };
  });
};

export const usePacks = (user: User | null) => {
  const [packs, setPacks] = useState<Map<string, PackData>>(new Map());
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  const selectedPack = selectedPackId ? packs.get(selectedPackId) : null;
  const packKeys = Array.from(packs.keys());
  const currentPackIndex = selectedPackId ? packKeys.indexOf(selectedPackId) : -1;

  // Load packs from database (fast path: 1 query for packs + 1 query for all queue rows)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const loadPacks = async () => {
      const { data: existingPacks, error } = await supabase
        .from("packs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error("Error loading packs:", error);
        toast.error("Failed to load packs");
        return;
      }

      if (!existingPacks || existingPacks.length === 0) {
        setPacks(new Map());
        setSelectedPackId(null);
        return;
      }

      const packIds = existingPacks.map((p) => p.id);

      const { data: queueRows, error: queueErr } = await supabase
        .from("generation_queue")
        .select("pack_id, shot_id, status, image_path, error_message, updated_at")
        .eq("user_id", user.id)
        .in("pack_id", packIds)
        .order("updated_at", { ascending: false });

      if (cancelled) return;

      if (queueErr) {
        console.warn("Error loading generation queue (continuing):", queueErr);
      }

      const rowsByPack = new Map<string, QueueRow[]>();
      for (const row of (queueRows as QueueRow[]) || []) {
        if (!row.pack_id) continue;
        const arr = rowsByPack.get(row.pack_id) || [];
        arr.push(row);
        rowsByPack.set(row.pack_id, arr);
      }

      const loadedPacks = new Map<string, PackData>();
      for (const dbPack of existingPacks) {
        const packFile = dbPack.pack_data as unknown as PackFile;
        const packRows = rowsByPack.get(dbPack.id);

        loadedPacks.set(dbPack.id, {
          pack: packFile,
          packId: dbPack.id,
          scenes: mergeQueueRowsIntoScenes(packFile, packRows),
          isGenerating: false,
          progress: 0,
        });
      }

      setPacks(loadedPacks);

      // IMPORTANT: don't stomp user's selection
      setSelectedPackId((prev) => {
        if (prev && loadedPacks.has(prev)) return prev;
        return loadedPacks.size > 0 ? Array.from(loadedPacks.keys())[0] : null;
      });
    };

    loadPacks();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Realtime: keep scene statuses/image URLs "anlık" up to date
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`generation_queue_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "generation_queue",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Never let deletes wipe UI state (users report "göründü sonra kayboldu")
          if ((payload as any).eventType === "DELETE") return;

          const row = (payload.new || payload.old) as QueueRow | undefined;
          if (!row?.pack_id) return;

          setPacks((prev) => {
            const existingPack = prev.get(row.pack_id!);
            if (!existingPack) return prev;

            const next = new Map(prev);

            const nextScenes = existingPack.scenes.map((s) => {
              if (normalizeSceneId(s.id) !== row.shot_id) return s;

              const { status: nextStatus, error } = getSceneStatusFromRow(row);

              if (nextStatus === "success") {
                // CRITICAL: Don't lose existing image if new row has no image_path
                if (!row.image_path) {
                  // If we already have an image, keep it and mark as success
                  if (s.imageUrl) {
                    return { ...s, status: "success" as SceneStatus, error: undefined };
                  }
                  // No image yet, show as generating (upload in progress)
                  return { ...s, status: "generating" as SceneStatus };
                }

                const {
                  data: { publicUrl },
                } = supabase.storage.from("generated-images").getPublicUrl(row.image_path);

                // Add cache-busting to ensure fresh image loads
                const urlWithCacheBust = `${publicUrl}?t=${new Date(row.updated_at || Date.now()).getTime()}`;
                return { ...s, status: "success" as SceneStatus, imageUrl: urlWithCacheBust, error: undefined };
              }

              if (nextStatus === "error") {
                // CRITICAL: Don't replace existing successful image with error
                if (s.status === "success" && s.imageUrl) {
                  console.warn(`Ignoring error status for scene ${s.id} that already has image`);
                  return s;
                }
                return {
                  ...s,
                  status: "error" as SceneStatus,
                  error: error || row.error_message || "Generation failed",
                };
              }

              if (nextStatus === "generating") {
                // CRITICAL: Don't downgrade from success to generating
                if (s.status === "success" && s.imageUrl) {
                  return s;
                }
                return { ...s, status: "generating" as SceneStatus };
              }

              // Don't downgrade to idle on unexpected statuses.
              return s;
            });

            next.set(row.pack_id!, { ...existingPack, scenes: nextScenes });
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handlePacksLoad = useCallback(
    async (newPacks: PackFile[]): Promise<PacksLoadResult> => {
      if (!user) {
        toast.error("Please sign in to upload packs");
        return {
          uploadedCount: 0,
          failed: newPacks.map((_, index) => ({ index, message: "Not signed in" })),
        };
      }

      const validPacks = newPacks
        .map((pack, index) => {
          const packId = getPackId(pack);
          const displayName = getPackName(pack);

          if (!packId || !displayName) {
            toast.error("Invalid JSON: missing pack_id or pack_name");
            return null;
          }

          if (!hasScenes(pack)) {
            toast.error("Invalid JSON: missing or empty scenes array");
            return null;
          }

          return { pack, displayName, packId, index };
        })
        .filter(Boolean) as Array<{ pack: PackFile; displayName: string; packId: string; index: number }>;

      if (validPacks.length === 0) {
        return {
          uploadedCount: 0,
          failed: newPacks.map((_, index) => ({ index, message: "Invalid pack file" })),
        };
      }

      const failed: Array<{ index: number; message: string }> = [];
      const inserted: Array<{ dbId: string; pack: PackFile }> = [];

      for (const item of validPacks) {
        try {
          const { data: insertedPack, error: packError } = await supabase
            .from("packs")
            .insert({
              pack_name: item.displayName,
              pack_id: item.packId,
              pack_data: item.pack as any,
              user_id: user.id,
            })
            .select()
            .single();

          if (packError || !insertedPack) {
            failed.push({ index: item.index, message: packError?.message || "Failed to save pack" });
            continue;
          }

          // Also store the exact uploaded pack JSON in storage next to generated images.
          // This guarantees Cloud Files can always export the pack template.
          try {
            const jsonBlob = new Blob([JSON.stringify(item.pack, null, 2)], { type: "application/json" });
            await supabase.storage
              .from("generated-images")
              .upload(`${item.packId}/pack.json`, jsonBlob, {
                upsert: true,
                contentType: "application/json",
              });
          } catch (e: any) {
            console.warn("Failed to upload pack.json to storage:", e);
          }

          inserted.push({ dbId: insertedPack.id, pack: item.pack });
        } catch (err: any) {
          failed.push({ index: item.index, message: err?.message || "Upload failed" });
        }
      }

      if (inserted.length > 0) {
        setPacks((prev) => {
          const next = new Map(prev);

          for (const it of inserted) {
            const initialScenes: SceneWithStatus[] = scenesToArray(it.pack).map((scene) => ({
              ...scene,
              status: "idle" as SceneStatus,
            }));

            next.set(it.dbId, {
              pack: it.pack,
              packId: it.dbId,
              scenes: initialScenes,
              isGenerating: false,
              progress: 0,
            });
          }

          return next;
        });

        // If nothing is selected, select the first newly uploaded pack.
        setSelectedPackId((prev) => prev ?? inserted[0].dbId);

        toast.success(`${inserted.length} pack(s) uploaded`);
      }

      if (failed.length > 0) {
        toast.error(`${failed.length} pack(s) failed`);
      }

      return { uploadedCount: inserted.length, failed };
    },
    [user]
  );

  const deletePack = useCallback(
    async (packId: string) => {
      if (!user) return;

      try {
        const { error: packError } = await supabase.from("packs").delete().eq("id", packId).eq("user_id", user.id);

        if (packError) throw packError;

        await supabase.from("generation_queue").delete().eq("pack_id", packId).eq("user_id", user.id);

        const updatedPacks = new Map(packs);
        updatedPacks.delete(packId);
        setPacks(updatedPacks);

        if (selectedPackId === packId) {
          const remainingPacks = Array.from(updatedPacks.keys());
          setSelectedPackId(remainingPacks.length > 0 ? remainingPacks[0] : null);
        }

        toast.success("Pack deleted successfully");
      } catch (error) {
        console.error("Error deleting pack:", error);
        toast.error("Failed to delete pack");
      }
    },
    [user, packs, selectedPackId]
  );

  const deleteAllPacks = useCallback(async () => {
    if (!user) return;

    const packIds = Array.from(packs.keys());

    try {
      for (const packId of packIds) {
        await supabase.from("packs").delete().eq("id", packId).eq("user_id", user.id);
        await supabase.from("generation_queue").delete().eq("pack_id", packId).eq("user_id", user.id);
      }

      setPacks(new Map());
      setSelectedPackId(null);
      toast.success("All packs deleted");
    } catch (error) {
      console.error("Error deleting all packs:", error);
      toast.error("Failed to delete all packs");
    }
  }, [user, packs]);

  const deleteMultiplePacks = useCallback(
    async (packIds: string[]) => {
      if (!user || packIds.length === 0) return;

      try {
        for (const packId of packIds) {
          await supabase.from("packs").delete().eq("id", packId).eq("user_id", user.id);
          await supabase.from("generation_queue").delete().eq("pack_id", packId).eq("user_id", user.id);
        }

        setPacks((prev) => {
          const next = new Map(prev);
          for (const packId of packIds) {
            next.delete(packId);
          }
          return next;
        });

        if (selectedPackId && packIds.includes(selectedPackId)) {
          const remainingPacks = Array.from(packs.keys()).filter((id) => !packIds.includes(id));
          setSelectedPackId(remainingPacks.length > 0 ? remainingPacks[0] : null);
        }

        toast.success(`${packIds.length} pack(s) deleted`);
      } catch (error) {
        console.error("Error deleting packs:", error);
        toast.error("Failed to delete packs");
      }
    },
    [user, packs, selectedPackId]
  );

  const getPackInfos = useCallback((): PackInfo[] => {
    return Array.from(packs.values()).map((packData) => {
      // Find the first successful scene with an image for thumbnail
      const firstSuccessScene = packData.scenes.find(
        (s) => s.status === "success" && s.imageUrl
      );

      return {
        pack: packData.pack,
        packId: packData.packId,
        totalShots: packData.scenes.length,
        completedShots: packData.scenes.filter((s) => s.status === "success").length,
        failedShots: packData.scenes.filter((s) => s.status === "error").length,
        generatingShots: packData.scenes.filter((s) => s.status === "generating").length,
        thumbnailUrl: firstSuccessScene?.imageUrl,
      };
    });
  }, [packs]);

  const navigatePack = useCallback(
    (direction: "prev" | "next") => {
      if (direction === "prev" && currentPackIndex > 0) {
        setSelectedPackId(packKeys[currentPackIndex - 1]);
      } else if (direction === "next" && currentPackIndex < packKeys.length - 1) {
        setSelectedPackId(packKeys[currentPackIndex + 1]);
      }
    },
    [currentPackIndex, packKeys]
  );

  return {
    packs,
    setPacks,
    selectedPackId,
    setSelectedPackId,
    selectedPack,
    packKeys,
    currentPackIndex,
    isGeneratingAll,
    setIsGeneratingAll,
    handlePacksLoad,
    deletePack,
    deleteAllPacks,
    deleteMultiplePacks,
    getPackInfos,
    navigatePack,
  };
};
