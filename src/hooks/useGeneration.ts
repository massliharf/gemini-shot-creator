import { useCallback, useState } from "react";
import { User } from "@supabase/supabase-js";
import { 
  SceneStatus, TokenUsage, PackGenerationStats, 
  getPackName, buildFinalPrompt, getGenerationConfig,
  calculateImageCost, GeminiModel, formatCost
} from "@/types/pack";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PackData, normalizeSceneId } from "./usePacks";

interface UseGenerationProps {
  user: User | null;
  packs: Map<string, PackData>;
  setPacks: React.Dispatch<React.SetStateAction<Map<string, PackData>>>;
  referenceImage: File | null;
  referenceImage2?: File | null;
  selectedModel: string;
  aspectRatio: string;
  imageSize: string;
  resolution?: string;
}

// Convert File to base64 + keep MIME type
const fileToBase64WithMime = (file: File): Promise<{ base64: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [prefix, b64] = result.split(",");
      const mimeMatch = prefix.match(/^data:([^;]+);base64$/);
      resolve({
        base64: b64,
        mimeType: (mimeMatch?.[1] || file.type || "image/jpeg").trim(),
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const useGeneration = ({
  user,
  packs,
  setPacks,
  referenceImage,
  referenceImage2,
  selectedModel,
  aspectRatio,
  imageSize,
  resolution = "1K",
}: UseGenerationProps) => {
  // Token usage tracking per pack
  const [packTokenStats, setPackTokenStats] = useState<Map<string, PackGenerationStats>>(new Map());
  
  const generateSingleScene = useCallback(async (packId: string, sceneId: string | number) => {
    if (!user) {
      toast.error('Please sign in to generate scenes');
      return;
    }

    const packData = packs.get(packId);
    if (!packData || !referenceImage) {
      toast.error('Please upload reference image');
      return;
    }

    const scene = packData.scenes.find(s => normalizeSceneId(s.id) === normalizeSceneId(sceneId));
    if (!scene) return;

    const sceneIdNum = normalizeSceneId(scene.id);
    const queueItem = {
      pack_id: packId,
      shot_id: sceneIdNum,
      shot_data: { ...scene, scene_id: sceneIdNum, selectedModel, aspectRatio, imageSize } as any,
      status: 'queued',
      user_id: user.id,
    };

    const { data: insertedItem, error: queueError } = await supabase
      .from('generation_queue')
      .insert(queueItem)
      .select()
      .single();

    if (queueError) {
      toast.error('Failed to create generation queue');
      console.error(queueError);
      return;
    }

    setPacks(prev => {
      const updated = new Map(prev);
      const existingPack = updated.get(packId);
      if (!existingPack) return prev;
      
      updated.set(packId, {
        ...existingPack,
        scenes: existingPack.scenes.map((s) => 
          normalizeSceneId(s.id) === normalizeSceneId(sceneId) ? { ...s, status: 'generating' as SceneStatus } : s
        ),
      });
      return updated;
    });

    const maxRetries = 3;
    let lastError: any = null;
    let success = false;

    for (let attempt = 0; attempt < maxRetries && !success; attempt++) {
      try {
        if (attempt > 0) {
          toast.info(`Retrying scene ${sceneId} (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Prepare base64 images
        const selfie = await fileToBase64WithMime(referenceImage);
        const selfie2 = referenceImage2 ? await fileToBase64WithMime(referenceImage2) : undefined;

        // Build final prompt: scene.prompt + style_anchor.prompt
        const finalPrompt = buildFinalPrompt(packData.pack, String(sceneId).padStart(2, "0"));
        const config = getGenerationConfig(packData.pack);

        const { data, error } = await supabase.functions.invoke('generate-image', {
          body: { 
            queueId: insertedItem.id,
            selfieBase64: selfie.base64,
            selfieMimeType: selfie.mimeType,
            selfie2Base64: selfie2?.base64,
            selfie2MimeType: selfie2?.mimeType,
            finalPrompt,
            model: selectedModel,
            temperature: config.temperature,
            topP: config.top_p,
            aspectRatio,
            resolution,
          },
        });

        // Track token usage with cost
        if (data?.tokenUsage) {
          const modelKey = (selectedModel === "pro" ? "gemini-3-pro-image-preview" : "gemini-2.5-flash-image") as GeminiModel;
          const resolutionKey = (resolution as "1K" | "2K" | "4K") || "1K";
          const cost = calculateImageCost(data.tokenUsage.promptTokens, modelKey, 1, resolutionKey);
          
          setPackTokenStats(prev => {
            const updated = new Map(prev);
            const existing = updated.get(packId);
            const packName = getPackName(packData.pack);
            updated.set(packId, {
              packId,
              packName,
              totalTokensUsed: (existing?.totalTokensUsed || 0) + (data.tokenUsage.totalTokens || 0),
              promptTokensUsed: (existing?.promptTokensUsed || 0) + (data.tokenUsage.promptTokens || 0),
              candidatesTokensUsed: (existing?.candidatesTokensUsed || 0) + (data.tokenUsage.candidatesTokens || 0),
              imagesGenerated: (existing?.imagesGenerated || 0) + 1,
              scenesGenerated: (existing?.scenesGenerated || 0) + 1,
              model: modelKey,
              resolution: resolutionKey,
              cost: {
                inputCost: (existing?.cost.inputCost || 0) + cost.inputCost,
                imageCost: (existing?.cost.imageCost || 0) + cost.imageCost,
                totalCost: (existing?.cost.totalCost || 0) + cost.totalCost,
                currency: "USD",
              },
              timestamp: new Date().toISOString(),
            });
            return updated;
          });
        }

        if (error) throw error;

        if (data && data.success === false) {
          const permanentFailures = ['policy_block', 'no_image_data', 'image_other'];
          const isPermanent = permanentFailures.includes(data.reason);
          
          setPacks(prev => {
            const updated = new Map(prev);
            const existingPack = updated.get(packId);
            if (!existingPack) return prev;
            
            updated.set(packId, {
              ...existingPack,
              scenes: existingPack.scenes.map((s) => 
                normalizeSceneId(s.id) === normalizeSceneId(sceneId) ? {
                  ...s, 
                  status: 'error' as SceneStatus,
                  error: data.message || 'Generation failed'
                } : s
              ),
            });
            return updated;
          });
          toast.error(`Scene ${sceneId}: ${data.message || 'Generation failed'}`, { duration: 6000 });
          
          if (isPermanent) {
            success = true;
            return;
          }
          throw new Error(data.message);
        }

        setPacks(prev => {
          const updated = new Map(prev);
          const existingPack = updated.get(packId);
          if (!existingPack) return prev;
          
          updated.set(packId, {
            ...existingPack,
            scenes: existingPack.scenes.map((s) => 
              normalizeSceneId(s.id) === normalizeSceneId(sceneId) ? {
                ...s, 
                status: 'success' as SceneStatus,
                imageUrl: data.imageUrl
              } : s
            ),
          });
          return updated;
        });
        
        toast.success(`Generated scene ${sceneId}`);
        success = true;
      } catch (error) {
        lastError = error;
        console.error(`Error generating scene (attempt ${attempt + 1}):`, error);
      }
    }

    if (!success) {
      setPacks(prev => {
        const updated = new Map(prev);
        const existingPack = updated.get(packId);
        if (!existingPack) return prev;
        
        updated.set(packId, {
          ...existingPack,
          scenes: existingPack.scenes.map((s) => 
            normalizeSceneId(s.id) === normalizeSceneId(sceneId) ? {
              ...s, 
              status: 'error' as SceneStatus,
              error: lastError instanceof Error ? lastError.message : 'Failed to generate after 3 attempts'
            } : s
          ),
        });
        return updated;
      });
      
      toast.error(`Failed to generate scene ${sceneId} after ${maxRetries} attempts`);
    }
  }, [user, packs, referenceImage, referenceImage2, selectedModel, aspectRatio, imageSize, setPacks, resolution]);

  const generatePackScenes = useCallback(async (packId: string) => {
    if (!user) {
      toast.error('Please sign in to generate scenes');
      return;
    }

    const packData = packs.get(packId);
    if (!packData || !referenceImage) {
      toast.error('Please upload reference image');
      return;
    }

    setPacks(prev => {
      const updated = new Map(prev);
      const existingPack = updated.get(packId);
      if (!existingPack) return prev;
      
      updated.set(packId, {
        ...existingPack,
        isGenerating: true,
        progress: 0,
      });
      return updated;
    });

    const currentPack = packs.get(packId)!;
    
    // Prepare base64 images once for all scenes
    const selfie = await fileToBase64WithMime(referenceImage);
    const selfie2 = referenceImage2 ? await fileToBase64WithMime(referenceImage2) : undefined;

    const queueItems = currentPack.scenes.map(scene => {
      const sceneIdNum = normalizeSceneId(scene.id);
      return {
        pack_id: packId,
        shot_id: sceneIdNum,
        shot_data: { ...scene, scene_id: sceneIdNum, selectedModel, aspectRatio, resolution } as any,
        status: 'queued',
        user_id: user.id,
      };
    });

    const { data: insertedItems, error: queueError } = await supabase
      .from('generation_queue')
      .insert(queueItems)
      .select();

    if (queueError) {
      toast.error('Failed to create generation queue');
      console.error(queueError);
      setPacks(prev => {
        const updated = new Map(prev);
        const existingPack = updated.get(packId);
        if (!existingPack) return prev;
        
        updated.set(packId, {
          ...existingPack,
          isGenerating: false,
        });
        return updated;
      });
      return;
    }

    // Reset token stats for this pack at start of generation
    const modelKey = (selectedModel === "pro" ? "gemini-3-pro-image-preview" : "gemini-2.5-flash-image") as GeminiModel;
    const resolutionKey = (resolution as "1K" | "2K" | "4K") || "1K";
    setPackTokenStats(prev => {
      const updated = new Map(prev);
      updated.set(packId, {
        packId,
        packName: getPackName(currentPack.pack),
        totalTokensUsed: 0,
        promptTokensUsed: 0,
        candidatesTokensUsed: 0,
        imagesGenerated: 0,
        scenesGenerated: 0,
        model: modelKey,
        resolution: resolutionKey,
        cost: { inputCost: 0, imageCost: 0, totalCost: 0, currency: "USD" },
        timestamp: new Date().toISOString(),
      });
      return updated;
    });

    const config = getGenerationConfig(currentPack.pack);

    for (let i = 0; i < insertedItems.length; i++) {
      const queueItem = insertedItems[i];
      
      setPacks(prev => {
        const updated = new Map(prev);
        const existingPack = updated.get(packId);
        if (!existingPack) return prev;
        
        updated.set(packId, {
          ...existingPack,
          scenes: existingPack.scenes.map((s) => 
            normalizeSceneId(s.id) === queueItem.shot_id ? { ...s, status: 'generating' as SceneStatus } : s
          ),
        });
        return updated;
      });

      const maxRetries = 3;
      let lastError: any = null;
      let success = false;

      for (let attempt = 0; attempt < maxRetries && !success; attempt++) {
        try {
          if (attempt > 0) {
            toast.info(`Retrying scene ${queueItem.shot_id} (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

          // Build final prompt: scene.prompt + style_anchor.prompt
          const sceneIdStr = String(queueItem.shot_id).padStart(2, "0");
          const finalPrompt = buildFinalPrompt(currentPack.pack, sceneIdStr);

          const { data, error } = await supabase.functions.invoke('generate-image', {
            body: { 
              queueId: queueItem.id,
              selfieBase64: selfie.base64,
              selfieMimeType: selfie.mimeType,
              selfie2Base64: selfie2?.base64,
              selfie2MimeType: selfie2?.mimeType,
              finalPrompt,
              model: selectedModel,
              temperature: config.temperature,
              topP: config.top_p,
              aspectRatio,
              resolution,
            },
          });

          // Track token usage with cost
          if (data?.tokenUsage) {
            const cost = calculateImageCost(data.tokenUsage.promptTokens, modelKey, 1, resolutionKey);
            
            setPackTokenStats(prev => {
              const updated = new Map(prev);
              const existing = updated.get(packId);
              const packName = getPackName(currentPack.pack);
              updated.set(packId, {
                packId,
                packName,
                totalTokensUsed: (existing?.totalTokensUsed || 0) + (data.tokenUsage.totalTokens || 0),
                promptTokensUsed: (existing?.promptTokensUsed || 0) + (data.tokenUsage.promptTokens || 0),
                candidatesTokensUsed: (existing?.candidatesTokensUsed || 0) + (data.tokenUsage.candidatesTokens || 0),
                imagesGenerated: (existing?.imagesGenerated || 0) + 1,
                scenesGenerated: (existing?.scenesGenerated || 0) + 1,
                model: modelKey,
                resolution: resolutionKey,
                cost: {
                  inputCost: (existing?.cost.inputCost || 0) + cost.inputCost,
                  imageCost: (existing?.cost.imageCost || 0) + cost.imageCost,
                  totalCost: (existing?.cost.totalCost || 0) + cost.totalCost,
                  currency: "USD",
                },
                timestamp: new Date().toISOString(),
              });
              return updated;
            });
          }

          if (error) throw error;

          if (data && data.success === false) {
            const permanentFailures = ['policy_block', 'no_image_data', 'image_other'];
            const isPermanent = permanentFailures.includes(data.reason);
            
            setPacks(prev => {
              const updated = new Map(prev);
              const existingPack = updated.get(packId);
              if (!existingPack) return prev;
              
              updated.set(packId, {
                ...existingPack,
                scenes: existingPack.scenes.map((s) => 
                  normalizeSceneId(s.id) === queueItem.shot_id ? {
                    ...s, 
                    status: 'error' as SceneStatus,
                    error: data.message || 'Generation failed'
                  } : s
                ),
                progress: i + 1,
              });
              return updated;
            });
            toast.error(`Scene ${queueItem.shot_id}: ${data.message || 'Generation failed'}`, { duration: 6000 });
            
            if (isPermanent) {
              success = true;
              break;
            }
            throw new Error(data.message);
          }

          setPacks(prev => {
            const updated = new Map(prev);
            const existingPack = updated.get(packId);
            if (!existingPack) return prev;
            
            updated.set(packId, {
              ...existingPack,
              scenes: existingPack.scenes.map((s) => 
                normalizeSceneId(s.id) === queueItem.shot_id ? {
                  ...s, 
                  status: 'success' as SceneStatus,
                  imageUrl: data.imageUrl
                } : s
              ),
              progress: i + 1,
            });
            return updated;
          });
          
          toast.success(`Generated scene ${queueItem.shot_id}`);
          success = true;
        } catch (error) {
          lastError = error;
          console.error(`Error generating scene (attempt ${attempt + 1}):`, error);
        }
      }

      if (!success) {
        setPacks(prev => {
          const updated = new Map(prev);
          const existingPack = updated.get(packId);
          if (!existingPack) return prev;
          
          updated.set(packId, {
            ...existingPack,
            scenes: existingPack.scenes.map((s) => 
              normalizeSceneId(s.id) === queueItem.shot_id ? {
                ...s, 
                status: 'error' as SceneStatus,
                error: lastError instanceof Error ? lastError.message : 'Failed to generate'
              } : s
            ),
            progress: i + 1,
          });
          return updated;
        });
      }
    }

    // Show token usage and cost summary
    const finalStats = packTokenStats.get(packId);
    if (finalStats && finalStats.totalTokensUsed > 0) {
      console.log(`Pack "${finalStats.packName}" completed:`, {
        scenes: finalStats.scenesGenerated,
        tokens: finalStats.totalTokensUsed,
        cost: formatCost(finalStats.cost.totalCost),
      });
      toast.success(
        `Pack completed! ${finalStats.scenesGenerated} scenes | ${formatCost(finalStats.cost.totalCost)}`,
        { duration: 5000 }
      );
    }

    setPacks(prev => {
      const updated = new Map(prev);
      const existingPack = updated.get(packId);
      if (!existingPack) return prev;
      
      updated.set(packId, {
        ...existingPack,
        isGenerating: false,
      });
      return updated;
    });
  }, [user, packs, referenceImage, referenceImage2, selectedModel, aspectRatio, resolution, setPacks, packTokenStats]);

  const regenerateScene = useCallback(async (packId: string, sceneId: string | number) => {
    // Reset scene status and regenerate
    setPacks(prev => {
      const updated = new Map(prev);
      const existingPack = updated.get(packId);
      if (!existingPack) return prev;
      
      updated.set(packId, {
        ...existingPack,
        scenes: existingPack.scenes.map((s) => 
          normalizeSceneId(s.id) === normalizeSceneId(sceneId) ? {
            ...s, 
            status: 'idle' as SceneStatus,
            error: undefined,
            imageUrl: undefined
          } : s
        ),
      });
      return updated;
    });

    await generateSingleScene(packId, sceneId);
  }, [generateSingleScene, setPacks]);

  const generateAllPacks = useCallback(async () => {
    const packIds = Array.from(packs.keys());
    for (const packId of packIds) {
      await generatePackScenes(packId);
    }
  }, [packs, generatePackScenes]);

  const getPackTokenStats = useCallback((packId: string) => {
    return packTokenStats.get(packId);
  }, [packTokenStats]);

  return {
    generateSingleScene,
    generatePackScenes,
    regenerateScene,
    generateAllPacks,
    getPackTokenStats,
    packTokenStats,
  };
};
