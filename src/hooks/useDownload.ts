import { useCallback } from "react";
import { toast } from "sonner";
import JSZip from "jszip";
import { PackData } from "./usePacks";
import { getPackId, getPackName, normalizeSceneId } from "@/types/pack";

interface UseDownloadProps {
  packs: Map<string, PackData>;
  selectedPackId: string | null;
}

const isIOS = () => {
  if (typeof navigator === "undefined") return false;
  // iOS + iPadOS (incl. iPadOS reporting as Mac)
  const ua = navigator.userAgent || "";
  const iOSUA = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = /Macintosh/.test(ua) && (navigator as any).maxTouchPoints > 1;
  return iOSUA || iPadOS;
};

const triggerDownload = (url: string, filename: string) => {
  // Best-effort: anchor download (works on most desktop browsers)
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // iOS Safari often ignores the download attribute for blob URLs.
  // Opening a new tab lets users save/share the file.
  if (isIOS()) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

// Small concurrency helper (keeps UI responsive without hammering network)
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, idx: number) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await fn(items[current], current);
    }
  });

  await Promise.all(workers);
  return results;
}

export const useDownload = ({ packs, selectedPackId }: UseDownloadProps) => {
  const selectedPack = selectedPackId ? packs.get(selectedPackId) : null;

  const downloadScene = useCallback(
    async (sceneId: string | number) => {
      if (!selectedPack) return;

      const scene = selectedPack.scenes.find(
        (s) => normalizeSceneId(s.id) === normalizeSceneId(sceneId)
      );
      if (!scene?.imageUrl) return;

      try {
        const response = await fetch(scene.imageUrl, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Image fetch failed: ${response.status}`);
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const packIdName = getPackId(selectedPack.pack) || getPackName(selectedPack.pack) || "pack";
        const filename = `${packIdName}_scene-${String(sceneId).padStart(2, "0")}.jpg`;

        triggerDownload(url, filename);
        setTimeout(() => URL.revokeObjectURL(url), 60_000);

        toast.success("Image downloaded");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        toast.error(`Failed to download image: ${message}`);
        console.error(error);
      }
    },
    [selectedPack]
  );

  const downloadPackAsZip = useCallback(
    async (packId: string) => {
      const packData = packs.get(packId);
      if (!packData) return;

      const successfulScenes = packData.scenes.filter((s) => s.status === "success" && s.imageUrl);

      if (successfulScenes.length === 0) {
        toast.error("No images to download");
        return;
      }

      try {
        toast.info(`ZIP hazırlanıyor... (${successfulScenes.length} görsel)`);
        const zip = new JSZip();

        const packIdName = String(getPackId(packData.pack) || getPackName(packData.pack) || "pack");
        const folder = zip.folder(packIdName);
        folder?.file("pack.json", JSON.stringify(packData.pack, null, 2));

        // Fetch in small parallel batches for speed without freezing
        await mapLimit(successfulScenes, 4, async (scene) => {
          const response = await fetch(scene.imageUrl!, { cache: "no-store" });
          if (!response.ok) {
            throw new Error(`Failed to fetch image for scene ${scene.id}: ${response.status}`);
          }
          const blob = await response.blob();
          const sceneIdStr = String(normalizeSceneId(scene.id)).padStart(2, "0");
          folder?.file(`scene-${sceneIdStr}.jpg`, blob);
        });

        // Images are already compressed (jpg/png). STORE avoids heavy CPU re-compression.
        const zipBlob = await zip.generateAsync({
          type: "blob",
          compression: "STORE",
          streamFiles: true,
        });

        const url = URL.createObjectURL(zipBlob);

        toast.success("ZIP hazır", {
          duration: 15000,
          action: {
            label: "İndir",
            onClick: () => {
              triggerDownload(url, `${packIdName}.zip`);
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            },
          },
        });

        // Safety cleanup if user doesn't click
        setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        toast.error(`Failed to create ZIP file: ${message}`);
        console.error(error);
      }
    },
    [packs]
  );

  const downloadAllPacks = useCallback(
    async () => {
      if (packs.size === 0) {
        toast.error("No packs to download");
        return;
      }

      try {
        const packsArr = Array.from(packs.values());
        toast.info(`ZIP hazırlanıyor... (${packsArr.length} pack)`);

        const zip = new JSZip();

        for (const packData of packsArr) {
          const packName = String(getPackId(packData.pack) || getPackName(packData.pack) || "pack");
          const folder = zip.folder(packName);
          folder?.file("pack.json", JSON.stringify(packData.pack, null, 2));

          const scenes = packData.scenes.filter((s) => s.status === "success" && s.imageUrl);

          // Parallel within each pack (small limit)
          await mapLimit(scenes, 4, async (scene) => {
            const response = await fetch(scene.imageUrl!, { cache: "no-store" });
            if (!response.ok) {
              throw new Error(`Failed to fetch image for ${packName} scene ${scene.id}: ${response.status}`);
            }
            const blob = await response.blob();
            const sceneIdStr = String(normalizeSceneId(scene.id)).padStart(2, "0");
            folder?.file(`scene-${sceneIdStr}.jpg`, blob);
          });
        }

        const zipBlob = await zip.generateAsync({
          type: "blob",
          compression: "STORE",
          streamFiles: true,
        });

        const url = URL.createObjectURL(zipBlob);
        const filename = `all-packs-${Date.now()}.zip`;

        toast.success("ZIP hazır", {
          duration: 15000,
          action: {
            label: "İndir",
            onClick: () => {
              triggerDownload(url, filename);
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            },
          },
        });

        setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        toast.error(`Failed to create ZIP file: ${message}`);
        console.error(error);
      }
    },
    [packs]
  );

  return {
    downloadScene,
    downloadPackAsZip,
    downloadAllPacks,
  };
};
