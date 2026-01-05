import { useCallback } from "react";
import { toast } from "sonner";
import JSZip from "jszip";
import { PackData } from "./usePacks";
import { getPackId, getPackName, normalizeSceneId } from "@/types/pack";
import {
  chunkArray,
  getMaxZipImagesPerPart,
  mapLimit,
  triggerDownload,
} from "@/lib/download-utils";

interface UseDownloadProps {
  packs: Map<string, PackData>;
  selectedPackId: string | null;
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

      const successfulScenes = packData.scenes.filter(
        (s) => s.status === "success" && s.imageUrl
      );

      if (successfulScenes.length === 0) {
        toast.error("No images to download");
        return;
      }

      const maxPerZip = getMaxZipImagesPerPart();
      const parts = chunkArray(successfulScenes, maxPerZip);

      try {
        toast.info(
          `ZIP hazırlanıyor... (${successfulScenes.length} görsel${
            parts.length > 1 ? `, ${parts.length} parça` : ""
          })`
        );

        const packIdName = String(
          getPackId(packData.pack) || getPackName(packData.pack) || "pack"
        );

        for (let partIndex = 0; partIndex < parts.length; partIndex++) {
          const zip = new JSZip();
          const folder = zip.folder(packIdName);
          folder?.file("pack.json", JSON.stringify(packData.pack, null, 2));

          await mapLimit(parts[partIndex], 4, async (scene) => {
            const response = await fetch(scene.imageUrl!, { cache: "no-store" });
            if (!response.ok) {
              throw new Error(
                `Failed to fetch image for scene ${scene.id}: ${response.status}`
              );
            }
            const blob = await response.blob();
            const sceneIdStr = String(normalizeSceneId(scene.id)).padStart(2, "0");
            folder?.file(`scene-${sceneIdStr}.jpg`, blob);
          });

          const zipBlob = await zip.generateAsync({
            type: "blob",
            compression: "STORE",
            streamFiles: true,
          });

          const url = URL.createObjectURL(zipBlob);
          const filename =
            parts.length > 1
              ? `${packIdName}-part-${partIndex + 1}-of-${parts.length}.zip`
              : `${packIdName}.zip`;

          toast.success(
            parts.length > 1
              ? `ZIP hazır (${partIndex + 1}/${parts.length})`
              : "ZIP hazır",
            {
              duration: 20000,
              action: {
                label: "İndir",
                onClick: () => {
                  triggerDownload(url, filename);
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                },
              },
            }
          );

          // Safety cleanup if user doesn't click
          setTimeout(() => URL.revokeObjectURL(url), 10 * 60_000);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";

        // This is the most common failure mode for big zips on the client.
        if (error instanceof RangeError) {
          toast.error(
            "ZIP oluşturulamadı: Tarayıcı belleği yetmedi. Daha küçük parçalara bölerek indir veya pack sayısını azalt."
          );
        } else {
          toast.error(`Failed to create ZIP file: ${message}`);
        }

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

      type DownloadItem = {
        packName: string;
        packData: PackData;
        sceneId: string;
        imageUrl: string;
      };

      const packsArr = Array.from(packs.values());
      const items: DownloadItem[] = [];

      for (const packData of packsArr) {
        const packName = String(
          getPackId(packData.pack) || getPackName(packData.pack) || "pack"
        );

        const scenes = packData.scenes.filter((s) => s.status === "success" && s.imageUrl);
        for (const scene of scenes) {
          items.push({
            packName,
            packData,
            sceneId: String(normalizeSceneId(scene.id)).padStart(2, "0"),
            imageUrl: scene.imageUrl!,
          });
        }
      }

      if (items.length === 0) {
        toast.error("No images to download");
        return;
      }

      const maxPerZip = getMaxZipImagesPerPart();
      const parts = chunkArray(items, maxPerZip);

      try {
        toast.info(
          `ZIP hazırlanıyor... (${items.length} görsel${
            parts.length > 1 ? `, ${parts.length} parça` : ""
          })`
        );

        for (let partIndex = 0; partIndex < parts.length; partIndex++) {
          const zip = new JSZip();
          const folderByPack = new Map<string, JSZip>();

          const ensureFolder = (packName: string, packData: PackData) => {
            const existing = folderByPack.get(packName);
            if (existing) return existing;
            const folder = zip.folder(packName) as JSZip;
            folder.file("pack.json", JSON.stringify(packData.pack, null, 2));
            folderByPack.set(packName, folder);
            return folder;
          };

          await mapLimit(parts[partIndex], 4, async (item) => {
            const response = await fetch(item.imageUrl, { cache: "no-store" });
            if (!response.ok) {
              throw new Error(
                `Failed to fetch image for ${item.packName} scene ${item.sceneId}: ${response.status}`
              );
            }
            const blob = await response.blob();
            const folder = ensureFolder(item.packName, item.packData);
            folder.file(`scene-${item.sceneId}.jpg`, blob);
          });

          const zipBlob = await zip.generateAsync({
            type: "blob",
            compression: "STORE",
            streamFiles: true,
          });

          const url = URL.createObjectURL(zipBlob);
          const filename =
            parts.length > 1
              ? `all-packs-part-${partIndex + 1}-of-${parts.length}.zip`
              : `all-packs-${Date.now()}.zip`;

          toast.success(
            parts.length > 1
              ? `ZIP hazır (${partIndex + 1}/${parts.length})`
              : "ZIP hazır",
            {
              duration: 20000,
              action: {
                label: "İndir",
                onClick: () => {
                  triggerDownload(url, filename);
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                },
              },
            }
          );

          setTimeout(() => URL.revokeObjectURL(url), 10 * 60_000);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";

        if (error instanceof RangeError) {
          toast.error(
            "Toplu ZIP oluşturulamadı: Tarayıcı belleği yetmedi. Packleri tek tek indirmen daha stabil olur."
          );
        } else {
          toast.error(`Failed to create ZIP file: ${message}`);
        }

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
