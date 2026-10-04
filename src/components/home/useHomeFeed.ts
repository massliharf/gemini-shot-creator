import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isDemoMode } from "@/lib/demo";

export interface HomePack {
  id: string;
  name: string;
  scenes: number;
  createdAt: string | null;
}

export interface HomeCreation {
  id: string;
  url: string;
  packId: string | null;
  updatedAt: string | null;
}

/** `null` while loading; an empty list means "nothing yet" (or the query failed) → Home shows samples. */
interface HomeFeed {
  packs: HomePack[] | null;
  creations: HomeCreation[] | null;
}

const asRecord = (v: unknown): Record<string, unknown> | undefined =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;

const packName = (packData: unknown, column: string | null): string => {
  const fromMeta = asRecord(asRecord(packData)?.meta)?.pack_name;
  if (typeof fromMeta === "string" && fromMeta.trim()) return fromMeta.trim();
  if (column?.trim()) return column.trim();
  return "Untitled pack";
};

const sceneCount = (packData: unknown): number => {
  const scenes = asRecord(packData)?.scenes;
  return Array.isArray(scenes) ? scenes.length : 0;
};

const publicUrl = (path: string, updatedAt: string | null) => {
  const { data } = supabase.storage.from("generated-images").getPublicUrl(path);
  // Same cache-bust as usePacks: re-generated scenes can reuse a storage path.
  return `${data.publicUrl}?t=${updatedAt ? new Date(updatedAt).getTime() : 0}`;
};

/**
 * The signed-in user's latest packs and successful generations for Home.
 * Demo mode has no real data, so it resolves to empty lists right away.
 */
export const useHomeFeed = (userId: string | undefined): HomeFeed => {
  const [feed, setFeed] = useState<HomeFeed>(() =>
    isDemoMode() ? { packs: [], creations: [] } : { packs: null, creations: null },
  );

  useEffect(() => {
    if (!userId) return;
    if (isDemoMode()) {
      setFeed({ packs: [], creations: [] });
      return;
    }
    let cancelled = false;

    supabase
      .from("packs")
      .select("id, pack_name, pack_data, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(4)
      .then(
        ({ data, error }) => {
          if (cancelled) return;
          if (error) console.warn("Home: could not load packs", error);
          const packs = (error ? [] : data ?? []).map((p) => ({
            id: p.id,
            name: packName(p.pack_data, p.pack_name),
            scenes: sceneCount(p.pack_data),
            createdAt: p.created_at,
          }));
          setFeed((f) => ({ ...f, packs }));
        },
        () => !cancelled && setFeed((f) => ({ ...f, packs: [] })),
      );

    supabase
      .from("generation_queue")
      .select("id, pack_id, image_path, updated_at")
      .eq("user_id", userId)
      .eq("status", "success")
      .not("image_path", "is", null)
      .order("updated_at", { ascending: false })
      .limit(7)
      .then(
        ({ data, error }) => {
          if (cancelled) return;
          if (error) console.warn("Home: could not load recent creations", error);
          const creations = (error ? [] : data ?? [])
            .filter((r): r is typeof r & { image_path: string } => !!r.image_path)
            .map((r) => ({ id: r.id, url: publicUrl(r.image_path, r.updated_at), packId: r.pack_id, updatedAt: r.updated_at }));
          setFeed((f) => ({ ...f, creations }));
        },
        () => !cancelled && setFeed((f) => ({ ...f, creations: [] })),
      );

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return feed;
};
