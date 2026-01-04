import { useState, useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { PackFile, LegacyPackFile, SceneWithStatus, SceneStatus, getPackId, getPackName, hasScenes, getScenes } from "@/types/pack";
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
  return typeof id === 'string' ? parseInt(id, 10) : id;
};

// Convert scenes to SceneWithStatus array
const scenesToArray = (packFile: PackFile): { id: string; title: string; prompt: string }[] => {
  const scenes = getScenes(packFile);
  if (!scenes || !Array.isArray(scenes)) return [];
  
  return scenes.map(scene => ({
    id: String(scene.id),
    title: `Scene ${scene.id}`,
    prompt: scene.prompt || ""
  }));
};

export const usePacks = (user: User | null) => {
  const [packs, setPacks] = useState<Map<string, PackData>>(new Map());
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  const selectedPack = selectedPackId ? packs.get(selectedPackId) : null;
  const packKeys = Array.from(packs.keys());
  const currentPackIndex = selectedPackId ? packKeys.indexOf(selectedPackId) : -1;

  // Load packs from database
  useEffect(() => {
    if (!user) return;

    const loadPacks = async () => {
      const { data: existingPacks, error } = await supabase
        .from('packs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading packs:', error);
        toast.error('Failed to load packs');
        return;
      }

      if (existingPacks && existingPacks.length > 0) {
        const loadedPacks = new Map<string, PackData>();
        
        for (const dbPack of existingPacks) {
          const packFile = dbPack.pack_data as unknown as PackFile;
          
          const { data: queueResults } = await supabase
            .from('generation_queue')
            .select('shot_id, status, image_path, error_message, updated_at')
            .eq('pack_id', dbPack.id)
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });

          type QueueResult = { shot_id: number; status: string; image_path: string | null; error_message: string | null; updated_at: string | null };
          const shotResults = new Map<number, QueueResult>();
          if (queueResults && queueResults.length > 0) {
            for (const q of queueResults) {
              const existing = shotResults.get(q.shot_id);
              if (!existing) {
                shotResults.set(q.shot_id, q);
              } else if (q.status === 'success' && q.image_path && (!existing.image_path || existing.status !== 'success')) {
                shotResults.set(q.shot_id, q);
              } else if (q.status === 'success' && existing.status !== 'success') {
                shotResults.set(q.shot_id, q);
              }
            }
          }

          const scenesArray = scenesToArray(packFile);
          const initialScenes: SceneWithStatus[] = scenesArray.map(scene => {
            const sceneIdNum = normalizeSceneId(scene.id);
            const result = shotResults.get(sceneIdNum);
            
            if (result?.status === 'success' && result.image_path) {
              const { data: { publicUrl } } = supabase.storage
                .from('generated-images')
                .getPublicUrl(result.image_path);
              
              return { ...scene, status: 'success' as SceneStatus, imageUrl: publicUrl };
            } else if (result?.status === 'error') {
              return { ...scene, status: 'error' as SceneStatus, error: result.error_message || 'Generation failed' };
            } else if (result?.status === 'generating') {
              return { ...scene, status: 'generating' as SceneStatus };
            }
            return { ...scene, status: 'idle' as SceneStatus };
          });

          loadedPacks.set(dbPack.id, {
            pack: packFile,
            packId: dbPack.id,
            scenes: initialScenes,
            isGenerating: false,
            progress: 0,
          });
        }

        setPacks(loadedPacks);
        
        if (loadedPacks.size > 0) {
          setSelectedPackId(Array.from(loadedPacks.keys())[0]);
        }
      }
    };

    loadPacks();
  }, [user]);

  const handlePacksLoad = useCallback(async (newPacks: PackFile[]): Promise<PacksLoadResult> => {
    if (!user) {
      toast.error('Please sign in to upload packs');
      return { uploadedCount: 0, failed: newPacks.map((_, index) => ({ index, message: 'Not signed in' })) };
    }

    const updatedPacks = new Map(packs);

    const validPacks = newPacks
      .map((pack, index) => {
        const packId = getPackId(pack);
        const displayName = getPackName(pack);
        
        if (!packId || !displayName) {
          toast.error('Invalid JSON: missing pack_id or pack_name');
          return null;
        }

        if (!hasScenes(pack)) {
          toast.error('Invalid JSON: missing or empty scenes array');
          return null;
        }

        return { pack, displayName, packId, index };
      })
      .filter(Boolean) as Array<{ pack: PackFile; displayName: string; packId: string; index: number }>;

    if (validPacks.length === 0) {
      return { uploadedCount: 0, failed: newPacks.map((_, index) => ({ index, message: 'Invalid pack file' })) };
    }

    const failed: Array<{ index: number; message: string }> = [];
    let uploadedCount = 0;

    for (const item of validPacks) {
      try {
        const { data: insertedPack, error: packError } = await supabase
          .from('packs')
          .insert({
            pack_name: item.displayName,
            pack_id: item.packId,
            pack_data: item.pack as any,
            user_id: user.id,
          })
          .select()
          .single();

        if (packError || !insertedPack) {
          failed.push({ index: item.index, message: packError?.message || 'Failed to save pack' });
          continue;
        }

        const initialScenes: SceneWithStatus[] = scenesToArray(item.pack).map((scene) => ({
          ...scene,
          status: 'idle' as SceneStatus,
        }));

        updatedPacks.set(insertedPack.id, {
          pack: item.pack,
          packId: insertedPack.id,
          scenes: initialScenes,
          isGenerating: false,
          progress: 0,
        });

        if (!selectedPackId && uploadedCount === 0) {
          setSelectedPackId(insertedPack.id);
        }

        uploadedCount += 1;
      } catch (err: any) {
        failed.push({ index: item.index, message: err?.message || 'Upload failed' });
      }
    }

    setPacks(updatedPacks);

    if (uploadedCount > 0) {
      toast.success(`${uploadedCount} pack(s) uploaded`);
    }
    if (failed.length > 0) {
      toast.error(`${failed.length} pack(s) failed`);
    }

    return { uploadedCount, failed };
  }, [user, packs, selectedPackId]);

  const deletePack = useCallback(async (packId: string) => {
    if (!user) return;

    try {
      const { error: packError } = await supabase
        .from('packs')
        .delete()
        .eq('id', packId)
        .eq('user_id', user.id);

      if (packError) throw packError;

      await supabase
        .from('generation_queue')
        .delete()
        .eq('pack_id', packId)
        .eq('user_id', user.id);

      const updatedPacks = new Map(packs);
      updatedPacks.delete(packId);
      setPacks(updatedPacks);

      if (selectedPackId === packId) {
        const remainingPacks = Array.from(updatedPacks.keys());
        setSelectedPackId(remainingPacks.length > 0 ? remainingPacks[0] : null);
      }

      toast.success('Pack deleted successfully');
    } catch (error) {
      console.error('Error deleting pack:', error);
      toast.error('Failed to delete pack');
    }
  }, [user, packs, selectedPackId]);

  const deleteAllPacks = useCallback(async () => {
    if (!user) return;
    
    const packIds = Array.from(packs.keys());
    
    try {
      for (const packId of packIds) {
        await supabase.from('packs').delete().eq('id', packId).eq('user_id', user.id);
        await supabase.from('generation_queue').delete().eq('pack_id', packId).eq('user_id', user.id);
      }
      
      setPacks(new Map());
      setSelectedPackId(null);
      toast.success('All packs deleted');
    } catch (error) {
      console.error('Error deleting all packs:', error);
      toast.error('Failed to delete all packs');
    }
  }, [user, packs]);

  const getPackInfos = useCallback((): PackInfo[] => {
    return Array.from(packs.values()).map(packData => ({
      pack: packData.pack,
      packId: packData.packId,
      totalShots: packData.scenes.length,
      completedShots: packData.scenes.filter(s => s.status === 'success').length,
      failedShots: packData.scenes.filter(s => s.status === 'error').length,
      generatingShots: packData.scenes.filter(s => s.status === 'generating').length,
    }));
  }, [packs]);

  const navigatePack = useCallback((direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentPackIndex > 0) {
      setSelectedPackId(packKeys[currentPackIndex - 1]);
    } else if (direction === 'next' && currentPackIndex < packKeys.length - 1) {
      setSelectedPackId(packKeys[currentPackIndex + 1]);
    }
  }, [currentPackIndex, packKeys]);

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
