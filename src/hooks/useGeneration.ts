import { useCallback, useState } from "react";
import { User } from "@supabase/supabase-js";
import { SceneStatus, PackFile, TokenUsage, PackGenerationStats, getPackName, getStyleAnchor, isV1Pack, isV2Pack, getFacePolicy, getRenderSettings, shotToPrompt, getGenerationConfig } from "@/types/pack";
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

// Convert File to base64 + keep MIME type (critical for Gemini input parsing)
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

// Build full prompt using new schema with style_anchor + identity preservation
const buildFullPrompt = (pack: PackFile, scenePrompt: string, isCoupleMode: boolean): string => {
  const apiRef = isCoupleMode 
    ? "the people in these reference images" 
    : "the person in this reference image";

  // Identity preservation instruction - critical for face conditioning
  let identityInstruction: string;
  
  // Check for V2 face policy
  const facePolicy = getFacePolicy(pack);
  if (facePolicy) {
    const protectionLevel = facePolicy.distortion_protection_level || "maximum";
    identityInstruction = isCoupleMode
      ? `IDENTITY (${protectionLevel.toUpperCase()} protection): Use the exact faces and identities of the two people shown in the reference images. Maintain their facial features, bone structure, skin tone, and overall appearance. Face structure MUST be preserved. Do NOT copy the reference images directly - create a NEW scene featuring these same people in the described scenario.`
      : `IDENTITY (${protectionLevel.toUpperCase()} protection): Use the exact face and identity of the person shown in the reference image. Maintain their facial features, bone structure, skin tone, hair, and overall appearance. Face structure MUST be preserved. Do NOT copy the reference image directly - create a NEW scene featuring this same person in the described scenario.`;
  } else {
    identityInstruction = isCoupleMode
      ? "IDENTITY: Use the exact faces and identities of the two people shown in the reference images. Maintain their facial features, skin tone, and overall appearance. Do NOT copy the reference images directly - create a NEW scene featuring these same people."
      : "IDENTITY: Use the exact face and identity of the person shown in the reference image. Maintain their facial features, skin tone, hair, and overall appearance. Do NOT copy the reference image directly - create a NEW scene featuring this same person.";
  }

  const parts = [identityInstruction];
  
  // For V1 packs, add style anchor
  const styleAnchor = getStyleAnchor(pack);
  if (styleAnchor) {
    const processedStyle = styleAnchor.replace(/\[SUBJECT\]/g, apiRef);
    parts.push(`STYLE: ${processedStyle}`);
  }
  
  // For V2 packs, add package description as style context
  if (isV2Pack(pack)) {
    parts.push(`STYLE: ${pack.package_meta.description}`);
  }
  
  // Add the scene prompt
  const processedScene = scenePrompt.replace(/\[SUBJECT\]/g, apiRef);
  parts.push(processedScene);
  
  return parts.join("\n\n");
};

// Get scene prompt from pack (supports both V1 and V2)
const getScenePrompt = (pack: PackFile, sceneId: string | number): string => {
  const normalizedId = typeof sceneId === 'string' ? parseInt(sceneId, 10) : sceneId;
  
  // V2 format: shots array with detailed structure
  if (isV2Pack(pack)) {
    const shot = pack.shots.find(s => s.shot_id === normalizedId);
    if (shot) {
      const facePolicy = getFacePolicy(pack);
      const renderSettings = getRenderSettings(pack);
      return shotToPrompt(shot, facePolicy, renderSettings);
    }
    return "";
  }
  
  // V1 format: scenes array with simple prompts
  if (isV1Pack(pack)) {
    const scenes = pack.scenes;
    if (!scenes || !Array.isArray(scenes)) return "";

    const scene = scenes.find(s => 
      String(s.id) === String(sceneId) || String(s.id) === String(sceneId).padStart(2, "0")
    );
    return scene?.prompt || "";
  }
  
  return "";
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

        // Prepare base64 images (with correct mime types)
        const selfie = await fileToBase64WithMime(referenceImage);
        const selfie2 = referenceImage2 ? await fileToBase64WithMime(referenceImage2) : undefined;
        const isCoupleMode = !!referenceImage2;

        // Get scene prompt and build full prompt
        const scenePromptSuffix = getScenePrompt(packData.pack, sceneId);
        const fullPrompt = buildFullPrompt(packData.pack, scenePromptSuffix, isCoupleMode);

        const { data, error } = await supabase.functions.invoke('generate-image', {
          body: { 
            queueId: insertedItem.id,
            selfieBase64: selfie.base64,
            selfieMimeType: selfie.mimeType,
            selfie2Base64: selfie2?.base64,
            selfie2MimeType: selfie2?.mimeType,
            fullPrompt,
            model: selectedModel,
            temperature: getGenerationConfig(packData.pack).temperature,
            topP: getGenerationConfig(packData.pack).top_p,
            aspectRatio,
            resolution,
          },
        });

        // Track token usage
        if (data?.tokenUsage) {
          setPackTokenStats(prev => {
            const updated = new Map(prev);
            const existing = updated.get(packId);
            const packName = getPackName(packData.pack);
            updated.set(packId, {
              packId,
              packName,
              totalTokensUsed: (existing?.totalTokensUsed || 0) + (data.tokenUsage.totalTokens || 0),
              scenesGenerated: (existing?.scenesGenerated || 0) + 1,
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
  }, [user, packs, referenceImage, referenceImage2, selectedModel, aspectRatio, imageSize, setPacks]);

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
    
    // Prepare base64 images once for all scenes (with correct mime types)
    const selfie = await fileToBase64WithMime(referenceImage);
    const selfie2 = referenceImage2 ? await fileToBase64WithMime(referenceImage2) : undefined;
    const isCoupleMode = !!referenceImage2;

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
    setPackTokenStats(prev => {
      const updated = new Map(prev);
      updated.set(packId, {
        packId,
        packName: getPackName(currentPack.pack),
        totalTokensUsed: 0,
        scenesGenerated: 0,
        timestamp: new Date().toISOString(),
      });
      return updated;
    });

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

          // Get scene prompt and build full prompt
          const scenePromptSuffix = getScenePrompt(currentPack.pack, queueItem.shot_id);
          const fullPrompt = buildFullPrompt(currentPack.pack, scenePromptSuffix, isCoupleMode);

           const { data, error } = await supabase.functions.invoke('generate-image', {
             body: { 
               queueId: queueItem.id,
               selfieBase64: selfie.base64,
               selfieMimeType: selfie.mimeType,
               selfie2Base64: selfie2?.base64,
               selfie2MimeType: selfie2?.mimeType,
               fullPrompt,
               model: selectedModel,
               temperature: getGenerationConfig(currentPack.pack).temperature,
               topP: getGenerationConfig(currentPack.pack).top_p,
               aspectRatio,
               resolution,
             },
           });

          // Track token usage
          if (data?.tokenUsage) {
            setPackTokenStats(prev => {
              const updated = new Map(prev);
              const existing = updated.get(packId);
              const packName = getPackName(currentPack.pack);
              updated.set(packId, {
                packId,
                packName,
                totalTokensUsed: (existing?.totalTokensUsed || 0) + (data.tokenUsage.totalTokens || 0),
                scenesGenerated: (existing?.scenesGenerated || 0) + 1,
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
                error: lastError instanceof Error ? lastError.message : 'Failed after 3 attempts'
              } : s
            ),
            progress: i + 1,
          });
          return updated;
        });
        
        toast.error(`Failed to generate scene ${queueItem.shot_id} after ${maxRetries} attempts`);
      }
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

    // Log final token usage
    const finalStats = packTokenStats.get(packId);
    if (finalStats) {
      console.log(`Pack "${finalStats.packName}" generation complete. Total tokens used: ${finalStats.totalTokensUsed}`);
    }

    toast.success('Pack generation complete!');
  }, [user, packs, referenceImage, referenceImage2, selectedModel, aspectRatio, resolution, setPacks, packTokenStats]);

  const generateAllPacks = useCallback(async () => {
    if (!user) {
      toast.error('Please sign in to generate');
      return;
    }

    if (!referenceImage) {
      toast.error('Please upload reference image');
      return;
    }

    const packIds = Array.from(packs.keys());
    if (packIds.length === 0) {
      toast.error('No packs to generate');
      return;
    }

    toast.info(`Starting generation for ${packIds.length} pack(s)...`);

    for (const packId of packIds) {
      await generatePackScenes(packId);
    }

    toast.success('All packs generated!');
  }, [user, packs, referenceImage, generatePackScenes]);

  const getPackTokenStats = useCallback((packId: string): PackGenerationStats | undefined => {
    return packTokenStats.get(packId);
  }, [packTokenStats]);

  return {
    generateSingleScene,
    generatePackScenes,
    generateAllPacks,
    getPackTokenStats,
    packTokenStats,
  };
};
