import { useCallback, useState } from "react";
import { User } from "@supabase/supabase-js";
import { 
  SceneStatus, TokenUsage, PackGenerationStats, 
  getPackName, buildFinalPrompt, getConfig,
  calculateImageCost, GeminiModel, formatCost
} from "@/types/pack";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PackData, normalizeSceneId } from "./usePacks";
import { ReferenceImage } from "./useReferenceImages";
import { GenerationMode } from "./useGenerationSettings";

interface UseGenerationProps {
  user: User | null;
  packs: Map<string, PackData>;
  setPacks: React.Dispatch<React.SetStateAction<Map<string, PackData>>>;
  referenceImages: ReferenceImage[];
  selectedModel: string;
  aspectRatio: string;
  imageSize: string;
  resolution?: string;
  generationGender?: "male" | "female";
  generationMode?: GenerationMode;
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

// Fetch URL image and convert to base64
const urlToBase64WithMime = async (url: string): Promise<{ base64: string; mimeType: string }> => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [prefix, b64] = result.split(",");
      const mimeMatch = prefix.match(/^data:([^;]+);base64$/);
      resolve({
        base64: b64,
        mimeType: (mimeMatch?.[1] || blob.type || "image/jpeg").trim(),
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Convert ReferenceImage to base64 (handles both File and URL)
const referenceImageToBase64 = async (ref: ReferenceImage): Promise<{ base64: string; mimeType: string } | null> => {
  if (ref.file) {
    return fileToBase64WithMime(ref.file);
  }
  if (ref.previewUrl) {
    return urlToBase64WithMime(ref.previewUrl);
  }
  return null;
};

export const useGeneration = ({
  user,
  packs,
  setPacks,
  referenceImages,
  selectedModel,
  aspectRatio,
  imageSize,
  resolution = "1K",
  generationGender,
  generationMode = "portrait",
}: UseGenerationProps) => {
  // Token usage tracking per pack
  const [packTokenStats, setPackTokenStats] = useState<Map<string, PackGenerationStats>>(new Map());
  
  // Get valid reference images (with file or previewUrl)
  const getValidReferenceImages = () => referenceImages.filter(img => img.file || img.previewUrl);
  const hasReferenceImage = () => getValidReferenceImages().length > 0;
  
  const generateSingleScene = useCallback(async (packId: string, sceneId: string | number, forceRegenerate: boolean = false) => {
    if (!user) {
      toast.error('Please sign in to generate scenes');
      return;
    }

    const packData = packs.get(packId);
    const validImages = getValidReferenceImages();
    if (!packData) {
      toast.error('Pack not found');
      return;
    }

    // Determine effective mode: if no reference images, force text-only
    const effectiveMode = validImages.length === 0 ? "text-only" : generationMode;

    const scene = packData.scenes.find(s => normalizeSceneId(s.id) === normalizeSceneId(sceneId));
    if (!scene) return;

    const sceneIdNum = normalizeSceneId(scene.id);

    // Check if scene already has a successful generation (prevent accidental regeneration)
    if (scene.status === 'success' && scene.imageUrl && !forceRegenerate) {
      console.log(`Scene ${sceneId} already generated. Use forceRegenerate=true to regenerate.`);
      toast.info(`Scene ${sceneId} already generated. Click regenerate button to replace.`);
      return;
    }

    // Check if already generating
    if (scene.status === 'generating') {
      toast.info(`Scene ${sceneId} is already being generated.`);
      return;
    }

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

        // Prepare base64 images - convert all reference images (may be empty for text-only)
        const imagePromises = validImages.map(img => referenceImageToBase64(img));
        const base64Images = (await Promise.all(imagePromises)).filter(Boolean) as { base64: string; mimeType: string }[];

        // Build final prompt: scene.prompt + style_anchor.prompt
        const finalPrompt = buildFinalPrompt(packData.pack, String(sceneId).padStart(2, "0"));
        const config = getConfig(packData.pack);

        const { data, error } = await supabase.functions.invoke('generate-image', {
          body: { 
            queueId: insertedItem.id,
            // Send all images as an array
            referenceImages: base64Images.length > 0 ? base64Images : undefined,
            // Keep legacy fields for backward compatibility
            selfieBase64: base64Images[0]?.base64,
            selfieMimeType: base64Images[0]?.mimeType,
            selfie2Base64: base64Images[1]?.base64,
            selfie2MimeType: base64Images[1]?.mimeType,
            finalPrompt,
            model: selectedModel,
            temperature: config.temperature,
            topP: config.top_p,
            aspectRatio,
            resolution,
            generationGender,
            generationMode: effectiveMode,
          },
        });

        // Track token usage with cost
        if (data?.tokenUsage) {
          const modelKey = (selectedModel === "gemini-3-pro-image-preview" ? "gemini-3-pro-image-preview" : selectedModel === "gemini-3.1-flash-image-preview" ? "gemini-3.1-flash-image-preview" : "gemini-2.5-flash-image") as GeminiModel;
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
  }, [user, packs, referenceImages, selectedModel, aspectRatio, imageSize, setPacks, resolution, generationMode, getValidReferenceImages]);

  const generatePackScenes = useCallback(async (packId: string, skipCompleted: boolean = true) => {
    if (!user) {
      toast.error('Please sign in to generate scenes');
      return;
    }

    const packData = packs.get(packId);
    const validImages = getValidReferenceImages();
    if (!packData || validImages.length === 0) {
      toast.error('Please upload reference image');
      return;
    }

    // Filter scenes: skip already successful ones unless forced
    const scenesToGenerate = skipCompleted 
      ? packData.scenes.filter(s => s.status !== 'success' && s.status !== 'generating')
      : packData.scenes.filter(s => s.status !== 'generating');

    if (scenesToGenerate.length === 0) {
      toast.info('All scenes are already generated. Use regenerate to replace them.');
      return;
    }

    const skippedCount = packData.scenes.length - scenesToGenerate.length;
    if (skippedCount > 0) {
      toast.info(`Skipping ${skippedCount} already completed scene(s)`);
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
    const imagePromises = validImages.map(img => referenceImageToBase64(img));
    const base64Images = (await Promise.all(imagePromises)).filter(Boolean) as { base64: string; mimeType: string }[];
    
    if (base64Images.length === 0) {
      toast.error('Failed to prepare reference images');
      setPacks(prev => {
        const updated = new Map(prev);
        const existingPack = updated.get(packId);
        if (!existingPack) return prev;
        updated.set(packId, { ...existingPack, isGenerating: false });
        return updated;
      });
      return;
    }

    const queueItems = scenesToGenerate.map(scene => {
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
    const modelKey = (selectedModel === "gemini-3-pro-image-preview" ? "gemini-3-pro-image-preview" : selectedModel === "gemini-3.1-flash-image-preview" ? "gemini-3.1-flash-image-preview" : "gemini-2.5-flash-image") as GeminiModel;
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

    const config = getConfig(currentPack.pack);

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
              // Send all images as an array
              referenceImages: base64Images,
              // Keep legacy fields for backward compatibility
              selfieBase64: base64Images[0]?.base64,
              selfieMimeType: base64Images[0]?.mimeType,
              selfie2Base64: base64Images[1]?.base64,
              selfie2MimeType: base64Images[1]?.mimeType,
              finalPrompt,
              model: selectedModel,
              temperature: config.temperature,
              topP: config.top_p,
              aspectRatio,
              resolution,
              generationGender,
              generationMode,
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
  }, [user, packs, referenceImages, selectedModel, aspectRatio, resolution, setPacks, packTokenStats, getValidReferenceImages]);

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
