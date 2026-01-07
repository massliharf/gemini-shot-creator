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

const statusToSceneStatus = (status: string | null | undefined): SceneStatus => {
  if (status === "success") return "success";
  if (status === "error") return "error";
  if (status === "generating" || status === "queued") return "generating";
  return "idle";
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
    // rows are sorted by updated_at desc; keep “best” for each shot
    for (const q of rows) {
      const existing = shotResults.get(q.shot_id);
      if (!existing) {
        shotResults.set(q.shot_id, q);
        continue;
      }
      if (q.status === "success" && q.image_path && (!existing.image_path || existing.status !== "success")) {
        shotResults.set(q.shot_id, q);
      } else if (q.status === "success" && existing.status !== "success") {
        shotResults.set(q.shot_id, q);
      }
    }
  }

  return scenesToArray(packFile).map((scene) => {
    const sceneIdNum = normalizeSceneId(scene.id);
    const result = shotResults.get(sceneIdNum);
    const sceneStatus = statusToSceneStatus(result?.status);

    if (sceneStatus === "success" && result?.image_path) {
      const {
        data: { publicUrl },
      } = supabase.storage.from("generated-images").getPublicUrl(result.image_path);

      return { ...scene, status: "success" as SceneStatus, imageUrl: publicUrl };
    }

    if (sceneStatus === "error") {
      return {
        ...scene,
        status: "error" as SceneStatus,
        error: result?.error_message || "Generation failed",
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

  // Realtime: keep scene statuses/image URLs “anlık” up to date
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

              const nextStatus = statusToSceneStatus(row.status);

              if (nextStatus === "success") {
                // Sometimes status flips to success before image_path is written.
                // In that case, keep whatever we already have instead of resetting.
                if (!row.image_path) {
                  return s.imageUrl ? { ...s, status: "success" as SceneStatus, error: undefined } : { ...s, status: "generating" as SceneStatus };
                }

                const {
                  data: { publicUrl },
                } = supabase.storage.from("generated-images").getPublicUrl(row.image_path);

                return { ...s, status: "success" as SceneStatus, imageUrl: publicUrl, error: undefined };
              }

              if (nextStatus === "error") {
                return {
                  ...s,
                  status: "error" as SceneStatus,
                  error: row.error_message || "Generation failed",
                };
              }

              if (nextStatus === "generating") {
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

  const getPackInfos = useCallback((): PackInfo[] => {
    return Array.from(packs.values()).map((packData) => ({
      pack: packData.pack,
      packId: packData.packId,
      totalShots: packData.scenes.length,
      completedShots: packData.scenes.filter((s) => s.status === "success").length,
      failedShots: packData.scenes.filter((s) => s.status === "error").length,
      generatingShots: packData.scenes.filter((s) => s.status === "generating").length,
    }));
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
    getPackInfos,
    navigatePack,
  };
};
