import { useCallback } from "react";
import { toast } from "sonner";
import JSZip from "jszip";
import { PackData, normalizeSceneId } from "./usePacks";
import { getPackId, getPackName } from "@/types/pack";

interface UseDownloadProps {
  packs: Map<string, PackData>;
  selectedPackId: string | null;
}

export const useDownload = ({ packs, selectedPackId }: UseDownloadProps) => {
  const selectedPack = selectedPackId ? packs.get(selectedPackId) : null;

  const downloadScene = useCallback(async (sceneId: string | number) => {
    if (!selectedPack) return;
    
    const scene = selectedPack.scenes.find(s => normalizeSceneId(s.id) === normalizeSceneId(sceneId));
    if (!scene?.imageUrl) return;

    try {
      const response = await fetch(scene.imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // New nested schema: meta.pack_id and meta.pack_name
      const packIdName = getPackId(selectedPack.pack) || getPackName(selectedPack.pack) || 'pack';
      const filename = `${packIdName}_scene-${String(sceneId).padStart(2, '0')}.jpg`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Image downloaded');
    } catch (error) {
      toast.error('Failed to download image');
      console.error(error);
    }
  }, [selectedPack]);

  const downloadPackAsZip = useCallback(async (packId: string) => {
    const packData = packs.get(packId);
    if (!packData) return;

    const successfulScenes = packData.scenes.filter(s => s.status === 'success' && s.imageUrl);
    
    if (successfulScenes.length === 0) {
      toast.error('No images to download');
      return;
    }

    try {
      toast.info('Creating ZIP file...');
      const zip = new JSZip();
      
      // New nested schema: meta.pack_id and meta.pack_name
      const packIdName = String(getPackId(packData.pack) || getPackName(packData.pack) || 'pack');
      const folder = zip.folder(packIdName);

      folder?.file('pack.json', JSON.stringify(packData.pack, null, 2));

      for (const scene of successfulScenes) {
        const response = await fetch(scene.imageUrl!);
        const blob = await response.blob();
        const sceneIdStr = String(normalizeSceneId(scene.id)).padStart(2, '0');
        const filename = `scene-${sceneIdStr}.jpg`;
        folder?.file(filename, blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${packIdName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('ZIP file downloaded');
    } catch (error) {
      toast.error('Failed to create ZIP file');
      console.error(error);
    }
  }, [packs]);

  const downloadAllPacks = useCallback(async () => {
    if (packs.size === 0) {
      toast.error('No packs to download');
      return;
    }

    try {
      toast.info('Creating ZIP file...');
      const zip = new JSZip();

      for (const [, packData] of packs) {
        // New nested schema: meta.pack_id and meta.pack_name
        const packName = String(getPackId(packData.pack) || getPackName(packData.pack) || 'pack');
        const folder = zip.folder(packName);
        
        folder?.file('pack.json', JSON.stringify(packData.pack, null, 2));

        for (const scene of packData.scenes) {
          if (scene.status === 'success' && scene.imageUrl) {
            const response = await fetch(scene.imageUrl);
            const blob = await response.blob();
            const sceneIdStr = String(normalizeSceneId(scene.id)).padStart(2, '0');
            const filename = `scene-${sceneIdStr}.jpg`;
            folder?.file(filename, blob);
          }
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `all-packs-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('ZIP file downloaded');
    } catch (error) {
      toast.error('Failed to create ZIP file');
      console.error(error);
    }
  }, [packs]);

  return {
    downloadScene,
    downloadPackAsZip,
    downloadAllPacks,
  };
};
