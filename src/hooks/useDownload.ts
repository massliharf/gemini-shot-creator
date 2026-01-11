import { useCallback } from "react";
import { toast } from "sonner";
import JSZip from "jszip";
import { PackData } from "./usePacks";
import { getPackId, getPackName, normalizeSceneId, PackFile } from "@/types/pack";
import {
  chunkArray,
  getMaxZipImagesPerPart,
  mapLimit,
  triggerDownload,
} from "@/lib/download-utils";

// Convert image to WebP using canvas
const convertToWebP = async (blob: Blob, quality: number = 0.85): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(blob); // fallback to original
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (webpBlob) => {
          if (webpBlob) {
            resolve(webpBlob);
          } else {
            resolve(blob); // fallback
          }
        },
        "image/webp",
        quality
      );
    };
    img.onerror = () => resolve(blob); // fallback
    img.src = URL.createObjectURL(blob);
  });
};

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
          `Preparing ZIP... (${successfulScenes.length} images${
            parts.length > 1 ? `, ${parts.length} parts` : ""
          })`
        );

        const packIdName = String(
          getPackId(packData.pack) || getPackName(packData.pack) || "pack"
        );

        for (let partIndex = 0; partIndex < parts.length; partIndex++) {
          const zip = new JSZip();
          const folder = zip.folder(packIdName);
          folder?.file(`${packIdName}.json`, JSON.stringify(packData.pack, null, 2));

          await mapLimit(parts[partIndex], 4, async (scene) => {
            const response = await fetch(scene.imageUrl!, { cache: "no-store" });
            if (!response.ok) {
              throw new Error(
                `Failed to fetch image for scene ${scene.id}: ${response.status}`
              );
            }
            const blob = await response.blob();
            const sceneIdStr = String(normalizeSceneId(scene.id)).padStart(2, "0");
            folder?.file(`${sceneIdStr}.jpg`, blob);
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
              ? `ZIP ready (${partIndex + 1}/${parts.length})`
              : "ZIP ready",
            {
              duration: 20000,
              action: {
                label: "Download",
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
            "Failed to create ZIP: Browser memory exhausted. Try downloading smaller parts."
          );
        } else {
          toast.error(`Failed to create ZIP file: ${message}`);
        }

        console.error(error);
      }
    },
    [packs]
  );

  // Download pack with WebP-optimized images (reduced size) + keep originals
  const downloadPackOptimized = useCallback(
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

      const packIdName = String(
        getPackId(packData.pack) || getPackName(packData.pack) || "pack"
      );

      try {
        const toastId = toast.loading(`Preparing ${packIdName}... (${successfulScenes.length} images)`);

        const zip = new JSZip();
        const folder = zip.folder(packIdName);
        
        // Add JSON with the pack name
        folder?.file(`${packIdName}.json`, JSON.stringify(packData.pack, null, 2));

        // Create originals subfolder
        const originalsFolder = folder?.folder("originals");

        let completed = 0;
        await mapLimit(successfulScenes, 4, async (scene) => {
          const response = await fetch(scene.imageUrl!, { cache: "no-store" });
          if (!response.ok) {
            throw new Error(`Scene ${scene.id} fetch failed: ${response.status}`);
          }
          const originalBlob = await response.blob();
          const sceneIdStr = String(normalizeSceneId(scene.id)).padStart(2, "0");
          
          // Save original
          originalsFolder?.file(`${sceneIdStr}.jpg`, originalBlob);
          
          // Convert to WebP (reduced)
          const webpBlob = await convertToWebP(originalBlob, 0.82);
          folder?.file(`${sceneIdStr}.webp`, webpBlob);

          completed++;
          toast.loading(`Preparing ${packIdName}... (${completed}/${successfulScenes.length})`, { id: toastId });
        });

        const zipBlob = await zip.generateAsync({
          type: "blob",
          compression: "DEFLATE",
          compressionOptions: { level: 6 },
          streamFiles: true,
        });

        toast.dismiss(toastId);

        const url = URL.createObjectURL(zipBlob);
        const filename = `${packIdName}-optimized.zip`;
        
        // Auto download
        triggerDownload(url, filename);
        
        const sizeMB = (zipBlob.size / 1024 / 1024).toFixed(1);
        toast.success(`${packIdName}.zip indirildi (${sizeMB} MB)`);
        
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";

        if (error instanceof RangeError) {
          toast.error("Failed to create ZIP: Memory exhausted");
        } else {
          toast.error(`ZIP error: ${message}`);
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
          `Preparing ZIP... (${items.length} images${
            parts.length > 1 ? `, ${parts.length} parts` : ""
          })`
        );

        for (let partIndex = 0; partIndex < parts.length; partIndex++) {
          const zip = new JSZip();
          const folderByPack = new Map<string, JSZip>();

          const ensureFolder = (packName: string, packData: PackData) => {
            const existing = folderByPack.get(packName);
            if (existing) return existing;
            const folder = zip.folder(packName) as JSZip;
            folder.file(`${packName}.json`, JSON.stringify(packData.pack, null, 2));
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
            folder.file(`${item.sceneId}.jpg`, blob);
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
              ? `ZIP ready (${partIndex + 1}/${parts.length})`
              : "ZIP ready",
            {
              duration: 20000,
              action: {
                label: "Download",
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
            "Failed to create ZIP: Browser memory exhausted. Try downloading packs individually."
          );
        } else {
          toast.error(`Failed to create ZIP file: ${message}`);
        }

        console.error(error);
      }
    },
    [packs]
  );

  // Download packs filtered by gender
  const downloadPacksByGender = useCallback(
    async (gender: string) => {
      if (packs.size === 0) {
        toast.error("No packs to download");
        return;
      }

      // Import getPackGender dynamically since it's used here
      const { getPackGender } = await import("@/types/pack");

      type DownloadItem = {
        packName: string;
        packData: PackData;
        sceneId: string;
        imageUrl: string;
      };

      const packsArr = Array.from(packs.values()).filter(packData => {
        const packGender = getPackGender(packData.pack) || "unisex";
        return packGender === gender;
      });

      if (packsArr.length === 0) {
        toast.error(`No ${gender} packs to download`);
        return;
      }

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
        toast.error(`No images in ${gender} packs`);
        return;
      }

      const maxPerZip = getMaxZipImagesPerPart();
      const parts = chunkArray(items, maxPerZip);

      try {
        toast.info(
          `Preparing ${gender} packs ZIP... (${packsArr.length} packs, ${items.length} images)`
        );

        const toastId = toast.loading(`Preparing ${gender} packs... (${items.length} images)`);

        for (let partIndex = 0; partIndex < parts.length; partIndex++) {
          const zip = new JSZip();
          const folderByPack = new Map<string, { folder: JSZip; originalsFolder: JSZip }>();

          const ensureFolder = (packName: string, packData: PackData) => {
            const existing = folderByPack.get(packName);
            if (existing) return existing;
            const folder = zip.folder(packName) as JSZip;
            folder.file(`${packName}.json`, JSON.stringify(packData.pack, null, 2));
            const originalsFolder = folder.folder("originals") as JSZip;
            folderByPack.set(packName, { folder, originalsFolder });
            return { folder, originalsFolder };
          };

          let completed = 0;
          await mapLimit(parts[partIndex], 4, async (item) => {
            const response = await fetch(item.imageUrl, { cache: "no-store" });
            if (!response.ok) {
              throw new Error(
                `Failed to fetch image for ${item.packName} scene ${item.sceneId}: ${response.status}`
              );
            }
            const originalBlob = await response.blob();
            const { folder, originalsFolder } = ensureFolder(item.packName, item.packData);
            
            // Save original
            originalsFolder.file(`${item.sceneId}.jpg`, originalBlob);
            
            // Convert to WebP
            const webpBlob = await convertToWebP(originalBlob, 0.82);
            folder.file(`${item.sceneId}.webp`, webpBlob);

            completed++;
            toast.loading(`Preparing ${gender} packs... (${completed}/${parts[partIndex].length})`, { id: toastId });
          });

          const zipBlob = await zip.generateAsync({
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: { level: 6 },
            streamFiles: true,
          });

          const url = URL.createObjectURL(zipBlob);
          const filename =
            parts.length > 1
              ? `${gender}-packs-part-${partIndex + 1}-of-${parts.length}.zip`
              : `${gender}-packs-${Date.now()}.zip`;

          triggerDownload(url, filename);
          
          const sizeMB = (zipBlob.size / 1024 / 1024).toFixed(1);
          toast.dismiss(toastId);
          toast.success(
            `${gender} packs downloaded (${packsArr.length} packs, ${sizeMB} MB)`,
            { duration: 5000 }
          );

          setTimeout(() => URL.revokeObjectURL(url), 60_000);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";

        if (error instanceof RangeError) {
          toast.error("Failed to create ZIP: Browser memory exhausted.");
        } else {
          toast.error(`Failed to create ZIP file: ${message}`);
        }

        console.error(error);
      }
    },
    [packs]
  );

  // Download multiple selected packs as a single ZIP
  const downloadMultiplePacks = useCallback(
    async (packIds: string[]) => {
      if (packIds.length === 0) {
        toast.error("No packs selected");
        return;
      }

      type DownloadItem = {
        packName: string;
        packData: PackData;
        sceneId: string;
        imageUrl: string;
      };

      const items: DownloadItem[] = [];

      for (const packId of packIds) {
        const packData = packs.get(packId);
        if (!packData) continue;

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
        toast.error("No images in selected packs");
        return;
      }

      const maxPerZip = getMaxZipImagesPerPart();
      const parts = chunkArray(items, maxPerZip);

      try {
        const toastId = toast.loading(`Preparing ${packIds.length} packs... (${items.length} images)`);

        for (let partIndex = 0; partIndex < parts.length; partIndex++) {
          const zip = new JSZip();
          const folderByPack = new Map<string, { folder: JSZip; originalsFolder: JSZip }>();

          const ensureFolder = (packName: string, packData: PackData) => {
            const existing = folderByPack.get(packName);
            if (existing) return existing;
            const folder = zip.folder(packName) as JSZip;
            folder.file(`${packName}.json`, JSON.stringify(packData.pack, null, 2));
            const originalsFolder = folder.folder("originals") as JSZip;
            folderByPack.set(packName, { folder, originalsFolder });
            return { folder, originalsFolder };
          };

          let completed = 0;
          await mapLimit(parts[partIndex], 4, async (item) => {
            const response = await fetch(item.imageUrl, { cache: "no-store" });
            if (!response.ok) {
              throw new Error(
                `Failed to fetch image for ${item.packName} scene ${item.sceneId}: ${response.status}`
              );
            }
            const originalBlob = await response.blob();
            const { folder, originalsFolder } = ensureFolder(item.packName, item.packData);
            
            // Save original
            originalsFolder.file(`${item.sceneId}.jpg`, originalBlob);
            
            // Convert to WebP
            const webpBlob = await convertToWebP(originalBlob, 0.82);
            folder.file(`${item.sceneId}.webp`, webpBlob);

            completed++;
            toast.loading(`Preparing packs... (${completed}/${parts[partIndex].length})`, { id: toastId });
          });

          const zipBlob = await zip.generateAsync({
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: { level: 6 },
            streamFiles: true,
          });

          const url = URL.createObjectURL(zipBlob);
          const filename =
            parts.length > 1
              ? `selected-packs-part-${partIndex + 1}-of-${parts.length}.zip`
              : `selected-packs-${Date.now()}.zip`;

          triggerDownload(url, filename);
          
          const sizeMB = (zipBlob.size / 1024 / 1024).toFixed(1);
          toast.dismiss(toastId);
          toast.success(
            `${packIds.length} pack(s) downloaded (${sizeMB} MB)`,
            { duration: 5000 }
          );

          setTimeout(() => URL.revokeObjectURL(url), 60_000);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";

        if (error instanceof RangeError) {
          toast.error("Failed to create ZIP: Browser memory exhausted.");
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
    downloadPackOptimized,
    downloadAllPacks,
    downloadPacksByGender,
    downloadMultiplePacks,
  };
};
