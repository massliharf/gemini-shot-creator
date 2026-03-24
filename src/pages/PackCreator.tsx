import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Upload, Wand2, Loader2, X, Check, Home, Camera, Box, 
  Sparkles, Palette, Sun, Layers, Eye, RefreshCw, Trash2,
  ImageIcon, Play, Film, ShoppingBag
} from "lucide-react";
import type { PackFile } from "@/types/pack";
import { getPackId, getPackName, getSceneCount, hasScenes, buildFinalPrompt, getConfig, getScenes } from "@/types/pack";
import { AppLayout } from "@/components/AppLayout";
import { User } from "@supabase/supabase-js";
import { usePackCreatorState } from "@/hooks/usePackCreatorState";

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  base64: string;
  status: 'pending' | 'generating' | 'success' | 'saved' | 'error';
  pack?: PackFile;
  error?: string;
}

interface GeneratedPack {
  id: string;
  pack: PackFile;
  saved: boolean;
  error?: string;
}

interface RenderProgress {
  packId: string;
  packName: string;
  totalScenes: number;
  completedScenes: number;
  failedScenes: number;
  sceneResults: { sceneId: string; imageUrl?: string; error?: string; status: 'pending' | 'rendering' | 'success' | 'error' }[];
}

const SCENE_COUNT_OPTIONS = [8, 12, 16, 20];

type PackType = "photography" | "god-eye" | "artist" | "eye" | "3d" | "artisto" | "reverse" | "portrait-clone" | "dop-architect" | "all-seeing-eye" | "creative" | "product";
type Gender = "male" | "female" | "unisex";

const PACK_TYPE_OPTIONS: { value: PackType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: "creative", label: "Creative Scene", icon: <Film className="h-5 w-5" />, description: "Full creative freedom - any composition" },
  { value: "product", label: "Product Shot", icon: <ShoppingBag className="h-5 w-5" />, description: "Product/object photography" },
  { value: "photography", label: "Visual Architect", icon: <Layers className="h-5 w-5" />, description: "7-layer portrait architecture" },
  { value: "god-eye", label: "God-Eye Director", icon: <Camera className="h-5 w-5" />, description: "2-layer concise style system" },
  { value: "artist", label: "Artist v1", icon: <Palette className="h-5 w-5" />, description: "Technical DNA + scene continuation" },
  { value: "eye", label: "Eye Director", icon: <Eye className="h-5 w-5" />, description: "Complete photoshoot session" },
  { value: "3d", label: "3D Character", icon: <Box className="h-5 w-5" />, description: "Render engine aesthetics" },
  { value: "artisto", label: "Artisto", icon: <Sparkles className="h-5 w-5" />, description: "Art Director portrait system" },
  { value: "reverse", label: "Reverse Engineer", icon: <RefreshCw className="h-5 w-5" />, description: "Clone style from reference" },
  { value: "portrait-clone", label: "Portrait Clone", icon: <Camera className="h-5 w-5" />, description: "Close-up enforcement clone" },
  { value: "dop-architect", label: "DoP Architect", icon: <Sun className="h-5 w-5" />, description: "Adaptive wardrobe strategy" },
  { value: "all-seeing-eye", label: "All Seeing Eye", icon: <Eye className="h-5 w-5" />, description: "God Mode visual engineering" },
];

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "unisex", label: "Unisex" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const LIGHTING_PRESETS = [
  "Natural window light", "Golden hour warmth", "Studio 3-point setup", "Dramatic chiaroscuro",
  "Soft diffused overcast", "Rim-lit silhouette", "Hard flash aesthetic", "Neon/colored gels",
];

const COLOR_PALETTES = [
  "Warm earth tones", "Cool blue shadows", "High contrast B&W", "Desaturated cinematic",
  "Vibrant saturated", "Film emulation (Portra)", "Film emulation (Kodachrome)", "Muted pastels",
];

const STYLE_INFLUENCES = [
  "Annie Leibovitz", "Peter Lindbergh", "Mario Testino", "Richard Avedon",
  "Helmut Newton", "Steven Meisel", "Tim Walker", "Paolo Roversi",
];

const RENDER_MODELS = [
  { value: "gemini-2.5-flash-image", label: "Flash", description: "Fast & cheap" },
  { value: "gemini-3.1-flash-image-preview", label: "Flash 3.1", description: "Pro quality, fast" },
  { value: "gemini-3-pro-image-preview", label: "Pro", description: "Best quality" },
];

const ASPECT_RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9"];

export default function PackCreator() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  
  // Generation state (transient)
  const [isGenerating, setIsGenerating] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [generationPhase, setGenerationPhase] = useState<"idle" | "creating-pack" | "rendering">("idle");
  const [renderProgress, setRenderProgress] = useState<RenderProgress[]>([]);
  
  // Persisted state
  const {
    inputMode, textPrompt, packType, sceneCount, category, subcategory,
    gender, showAdvanced, selectedInfluences, lightingPreference, colorPalette,
    generatedPacks, images, autoRender, renderModel, renderAspectRatio, renderResolution,
    setInputMode, setTextPrompt, setPackType, setSceneCount, setCategory, setSubcategory,
    setGender, setShowAdvanced, setSelectedInfluences, setLightingPreference, setColorPalette,
    setGeneratedPacks, setImages, setAutoRender, setRenderModel, setRenderAspectRatio, setRenderResolution,
  } = usePackCreatorState();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setIsAuthenticated(true);
        setUserEmail(session.user.email || "");
        setUser(session.user);
      }
    });
  }, [navigate]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter(f => f.type.startsWith("image/"));
    if (validFiles.length !== files.length) {
      toast.error("Some files were skipped (not images)");
    }

    const newImages: UploadedImage[] = await Promise.all(
      validFiles.map(async (file) => {
        const base64 = await fileToBase64(file);
        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          preview: URL.createObjectURL(file),
          base64,
          status: 'pending' as const,
        };
      })
    );

    setImages(prev => [...prev, ...newImages]);
    toast.success(`${newImages.length} image(s) added`);
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter(i => i.id !== id);
    });
  };

  const clearAllImages = () => {
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setImages([]);
  };

  const toggleInfluence = (influence: string) => {
    setSelectedInfluences(prev => 
      prev.includes(influence)
        ? prev.filter(i => i !== influence)
        : [...prev, influence].slice(0, 3)
    );
  };

  const savePackToDatabase = async (pack: PackFile): Promise<{ saved: boolean; dbId?: string }> => {
    if (!user) return { saved: false };

    const packId = getPackId(pack);
    const packName = getPackName(pack);

    if (!packId || !packName || !hasScenes(pack)) {
      console.error("Invalid pack structure");
      return { saved: false };
    }

    try {
      const { data: insertedData, error } = await supabase
        .from('packs')
        .insert({
          pack_name: packName,
          pack_id: packId,
          pack_data: pack as any,
          user_id: user.id,
        })
        .select('id')
        .single();

      if (error) {
        console.error("Failed to save pack:", error);
        return { saved: false };
      }

      // Also store JSON in storage
      try {
        const jsonBlob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
        await supabase.storage
          .from("generated-images")
          .upload(`${packId}/pack.json`, jsonBlob, { upsert: true, contentType: "application/json" });
      } catch (e) {
        console.warn("Failed to upload pack.json to storage:", e);
      }

      return { saved: true, dbId: insertedData?.id };
    } catch (err) {
      console.error("Error saving pack:", err);
      return { saved: false };
    }
  };

  // ===== Auto-render: generate images for all scenes in a pack =====
  const renderPackImages = async (pack: PackFile, dbId: string, referenceBase64: string) => {
    if (!user) return;
    
    const scenes = getScenes(pack);
    const packId = getPackId(pack);
    const packName = getPackName(pack);
    
    const progress: RenderProgress = {
      packId,
      packName,
      totalScenes: scenes.length,
      completedScenes: 0,
      failedScenes: 0,
      sceneResults: scenes.map(s => ({ sceneId: s.id, status: 'pending' as const })),
    };
    
    setRenderProgress(prev => [...prev, progress]);
    
    // Extract base64 data from data URL
    const base64Data = referenceBase64.includes(',') ? referenceBase64.split(',')[1] : referenceBase64;
    const mimeMatch = referenceBase64.match(/^data:([^;]+);base64/);
    const mimeType = mimeMatch?.[1] || "image/jpeg";
    
    // Process scenes in batches of 3 to avoid rate limiting
    const batchSize = 3;
    for (let i = 0; i < scenes.length; i += batchSize) {
      const batch = scenes.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(async (scene) => {
          // Update scene status to rendering
          setRenderProgress(prev => prev.map(p => 
            p.packId === packId 
              ? { ...p, sceneResults: p.sceneResults.map(sr => sr.sceneId === scene.id ? { ...sr, status: 'rendering' as const } : sr) }
              : p
          ));
          
          try {
            // Create queue item
            const { data: queueItem, error: queueError } = await supabase
              .from('generation_queue')
              .insert({
                pack_id: dbId,
                shot_id: parseInt(scene.id, 10),
                shot_data: { ...scene, scene_id: parseInt(scene.id, 10), selectedModel: renderModel, aspectRatio: renderAspectRatio } as any,
                status: 'queued',
                user_id: user.id,
              })
              .select()
              .single();

            if (queueError) throw queueError;

            const finalPrompt = buildFinalPrompt(pack, scene.id);
            
            const { data, error } = await supabase.functions.invoke('generate-image', {
              body: {
                queueId: queueItem.id,
                referenceImages: [{ base64: base64Data, mimeType }],
                selfieBase64: base64Data,
                selfieMimeType: mimeType,
                finalPrompt,
                model: renderModel,
                aspectRatio: renderAspectRatio,
                resolution: renderResolution,
              },
            });

            if (error) throw error;
            if (data && data.success === false) throw new Error(data.message || "Render failed");

            // Success
            setRenderProgress(prev => prev.map(p => 
              p.packId === packId 
                ? { 
                    ...p, 
                    completedScenes: p.completedScenes + 1,
                    sceneResults: p.sceneResults.map(sr => 
                      sr.sceneId === scene.id ? { ...sr, status: 'success' as const, imageUrl: data?.imageUrl } : sr
                    )
                  }
                : p
            ));
          } catch (err) {
            console.error(`Scene ${scene.id} render failed:`, err);
            setRenderProgress(prev => prev.map(p => 
              p.packId === packId 
                ? { 
                    ...p, 
                    failedScenes: p.failedScenes + 1,
                    completedScenes: p.completedScenes + 1,
                    sceneResults: p.sceneResults.map(sr => 
                      sr.sceneId === scene.id ? { ...sr, status: 'error' as const, error: err instanceof Error ? err.message : "Unknown error" } : sr
                    )
                  }
                : p
            ));
          }
        })
      );
      
      // Small delay between batches
      if (i + batchSize < scenes.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  };

  const handleGenerateBatch = async () => {
    const pendingImages = images.filter(img => img.status === 'pending' || img.status === 'error');
    if (pendingImages.length === 0) {
      toast.error("No images to generate");
      return;
    }

    setIsGenerating(true);
    setCompletedCount(0);
    setGenerationPhase("creating-pack");
    if (autoRender) setRenderProgress([]);

    // Mark all pending as generating
    setImages(prev => prev.map(p => 
      pendingImages.find(pi => pi.id === p.id) 
        ? { ...p, status: 'generating' as const } 
        : p
    ));

    // Process all images in parallel
    const results = await Promise.allSettled(
      pendingImages.map(async (img) => {
        try {
          const { data, error } = await supabase.functions.invoke("generate-pack-v2", {
            body: {
              imageBase64: img.base64,
              sceneCount, packType, gender, category, subcategory,
              styleInfluences: selectedInfluences,
              lightingPreference, colorPalette,
            },
          });

          if (error) throw error;

          const packsToSave: PackFile[] = [];
          if (data.success && data.packs && Array.isArray(data.packs)) {
            packsToSave.push(...data.packs);
          } else if (data.success && data.pack) {
            packsToSave.push(data.pack as PackFile);
          }

          if (packsToSave.length === 0) {
            throw new Error(data.error || "Failed to create pack");
          }

          const savedResults = await Promise.all(
            packsToSave.map(async (pack) => {
              const { saved, dbId } = await savePackToDatabase(pack);
              return { pack, saved, dbId };
            })
          );
          
          setCompletedCount(prev => prev + 1);
          return { id: img.id, packs: savedResults, referenceBase64: img.base64 };
        } catch (error) {
          setCompletedCount(prev => prev + 1);
          throw { id: img.id, error };
        }
      })
    );

    // Update image statuses
    let totalSavedCount = 0;
    const packsToRender: { pack: PackFile; dbId: string; referenceBase64: string }[] = [];
    
    setImages(prev => prev.map(p => {
      const result = results.find(r => {
        if (r.status === "fulfilled") return r.value.id === p.id;
        if (r.status === "rejected") return r.reason?.id === p.id;
        return false;
      });

      if (!result) return p;

      if (result.status === "fulfilled") {
        const packsData = result.value.packs;
        
        for (const { pack, saved, dbId } of packsData) {
          if (saved) totalSavedCount++;
          setGeneratedPacks(prevPacks => [{
            id: `${result.value.id}-${getPackId(pack)}`,
            pack,
            saved,
          }, ...prevPacks]);
          
          // Queue for rendering if auto-render is on
          if (autoRender && saved && dbId) {
            packsToRender.push({ pack, dbId, referenceBase64: result.value.referenceBase64 });
          }
        }

        const allSaved = packsData.every(pd => pd.saved);
        const firstPack = packsData[0]?.pack;
        
        return { ...p, status: allSaved ? 'saved' as const : 'success' as const, pack: firstPack };
      } else {
        return { ...p, status: 'error' as const, error: result.reason?.error?.message || "Unknown error" };
      }
    }));

    const failCount = results.filter(r => r.status === "rejected").length;

    if (totalSavedCount > 0) {
      toast.success(`${totalSavedCount} pack(s) created and saved!`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} image(s) failed`);
    }

    // Phase 2: Auto-render images
    if (autoRender && packsToRender.length > 0) {
      setGenerationPhase("rendering");
      toast.info(`Starting image rendering for ${packsToRender.length} pack(s)...`);
      
      for (const { pack, dbId, referenceBase64 } of packsToRender) {
        await renderPackImages(pack, dbId, referenceBase64);
      }
      
      const totalRendered = renderProgress.reduce((sum, p) => sum + p.completedScenes - p.failedScenes, 0);
      toast.success(`Rendering complete!`);
    }

    setIsGenerating(false);
    setGenerationPhase("idle");
  };

  const handleGenerateText = async () => {
    if (!textPrompt.trim()) {
      toast.error("Please enter a creative brief");
      return;
    }

    setIsGenerating(true);
    setGenerationPhase("creating-pack");
    if (autoRender) setRenderProgress([]);
    const genId = `gen-${Date.now()}`;

    try {
      const { data, error } = await supabase.functions.invoke("generate-pack-v2", {
        body: {
          textPrompt, sceneCount, packType, gender, category, subcategory,
          styleInfluences: selectedInfluences, lightingPreference, colorPalette,
        },
      });

      if (error) throw error;

      const packsToSave: PackFile[] = [];
      if (data.success && data.packs && Array.isArray(data.packs)) {
        packsToSave.push(...data.packs);
      } else if (data.success && data.pack) {
        packsToSave.push(data.pack as PackFile);
      }

      if (packsToSave.length === 0) {
        throw new Error(data.error || "Failed to create pack");
      }

      const packsToRender: { pack: PackFile; dbId: string }[] = [];
      let savedCount = 0;
      
      for (const pack of packsToSave) {
        const { saved, dbId } = await savePackToDatabase(pack);
        if (saved) savedCount++;

        setGeneratedPacks(prev => [{
          id: `${genId}-${getPackId(pack)}`,
          pack,
          saved,
        }, ...prev]);
        
        if (autoRender && saved && dbId) {
          packsToRender.push({ pack, dbId });
        }
      }

      toast.success(savedCount > 0 ? `${savedCount} pack(s) created and saved!` : "Pack(s) created (save failed)");
      
      // Auto-render for text mode — no reference image, just prompts
      if (autoRender && packsToRender.length > 0) {
        setGenerationPhase("rendering");
        toast.info(`Starting image rendering for ${packsToRender.length} pack(s)...`);
        
        for (const { pack, dbId } of packsToRender) {
          // Text mode: no reference image, generate from prompt only
          await renderPackImagesFromText(pack, dbId);
        }
        
        toast.success("Rendering complete!");
      }
    } catch (error) {
      console.error("Generation error:", error);
      toast.error(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setIsGenerating(false);
      setGenerationPhase("idle");
    }
  };

  // Render images for text-based packs (no reference image)
  const renderPackImagesFromText = async (pack: PackFile, dbId: string) => {
    if (!user) return;
    
    const scenes = getScenes(pack);
    const packId = getPackId(pack);
    const packName = getPackName(pack);
    
    const progress: RenderProgress = {
      packId, packName,
      totalScenes: scenes.length,
      completedScenes: 0, failedScenes: 0,
      sceneResults: scenes.map(s => ({ sceneId: s.id, status: 'pending' as const })),
    };
    
    setRenderProgress(prev => [...prev, progress]);
    
    const batchSize = 3;
    for (let i = 0; i < scenes.length; i += batchSize) {
      const batch = scenes.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(async (scene) => {
          setRenderProgress(prev => prev.map(p => 
            p.packId === packId 
              ? { ...p, sceneResults: p.sceneResults.map(sr => sr.sceneId === scene.id ? { ...sr, status: 'rendering' as const } : sr) }
              : p
          ));
          
          try {
            const { data: queueItem, error: queueError } = await supabase
              .from('generation_queue')
              .insert({
                pack_id: dbId,
                shot_id: parseInt(scene.id, 10),
                shot_data: { ...scene, scene_id: parseInt(scene.id, 10) } as any,
                status: 'queued',
                user_id: user.id,
              })
              .select()
              .single();

            if (queueError) throw queueError;

            const finalPrompt = buildFinalPrompt(pack, scene.id);
            
            const { data, error } = await supabase.functions.invoke('generate-image', {
              body: {
                queueId: queueItem.id,
                finalPrompt,
                model: renderModel,
                aspectRatio: renderAspectRatio,
                resolution: renderResolution,
                generationMode: "text-only",
              },
            });

            if (error) throw error;
            if (data && data.success === false) throw new Error(data.message || "Render failed");

            setRenderProgress(prev => prev.map(p => 
              p.packId === packId 
                ? { 
                    ...p, 
                    completedScenes: p.completedScenes + 1,
                    sceneResults: p.sceneResults.map(sr => 
                      sr.sceneId === scene.id ? { ...sr, status: 'success' as const, imageUrl: data?.imageUrl } : sr
                    )
                  }
                : p
            ));
          } catch (err) {
            console.error(`Scene ${scene.id} render failed:`, err);
            setRenderProgress(prev => prev.map(p => 
              p.packId === packId 
                ? { 
                    ...p, 
                    failedScenes: p.failedScenes + 1,
                    completedScenes: p.completedScenes + 1,
                    sceneResults: p.sceneResults.map(sr => 
                      sr.sceneId === scene.id ? { ...sr, status: 'error' as const, error: err instanceof Error ? err.message : "Unknown error" } : sr
                    )
                  }
                : p
            ));
          }
        })
      );
      
      if (i + batchSize < scenes.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  };

  const handleGenerate = () => {
    if (inputMode === "image") {
      handleGenerateBatch();
    } else {
      handleGenerateText();
    }
  };

  const pendingCount = images.filter(i => i.status === 'pending').length;
  const savedCount = images.filter(i => i.status === 'saved').length;
  const errorCount = images.filter(i => i.status === 'error').length;
  const generatingCount = images.filter(i => i.status === 'generating').length;
  const progress = generatingCount > 0 ? (completedCount / generatingCount) * 100 : 0;

  // Calculate total render progress
  const totalRenderScenes = renderProgress.reduce((sum, p) => sum + p.totalScenes, 0);
  const totalRenderCompleted = renderProgress.reduce((sum, p) => sum + p.completedScenes, 0);
  const renderPercent = totalRenderScenes > 0 ? (totalRenderCompleted / totalRenderScenes) * 100 : 0;

  if (!isAuthenticated) return null;

  return (
    <AppLayout userEmail={userEmail}>
      <main className="flex-1 bg-card rounded-2xl border border-border/50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h1 className="text-sm font-semibold">
                {packType === "god-eye" ? "God-Eye Photography Director" : 
                 packType === "artist" ? "Artist v1" :
                 packType === "eye" ? "Eye Portrait Director" :
                 packType === "3d" ? "3D Visual Architect" : 
                 packType === "artisto" ? "Artisto Portrait Director" :
                 packType === "reverse" ? "Style Reverse Engineer" :
                 packType === "portrait-clone" ? "Portrait Style Clone" :
                 packType === "dop-architect" ? "DoP Visual Architect" :
                 packType === "all-seeing-eye" ? "All Seeing Eye" :
                 "Omniscient Visual Architect"}
              </h1>
              {autoRender && (
                <Badge variant="secondary" className="text-[10px] h-5">
                  <Play className="h-3 w-3 mr-1" />
                  Auto-Render
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
              <span>
                {packType === "god-eye" ? "2-layer style system" : 
                 packType === "artist" ? "Technical DNA + scene continuation" :
                 packType === "eye" ? "Photoshoot session logic" :
                 packType === "3d" ? "Render engine aesthetics" : 
                 packType === "artisto" ? "Art Director portrait system" :
                 packType === "reverse" ? "Visual forensics & style cloning" :
                 packType === "portrait-clone" ? "Close-up enforced style transfer" :
                 packType === "dop-architect" ? "Adaptive intelligence & wardrobe strategy" :
                 packType === "all-seeing-eye" ? "God Mode visual engineering" :
                 "7-layer prompt architecture"}
              </span>
              {images.length > 0 && (
                <>
                  <span>•</span>
                  <span>{images.length} images</span>
                  {savedCount > 0 && <span className="text-green-500">• {savedCount} saved</span>}
                  {errorCount > 0 && <span className="text-red-500">• {errorCount} failed</span>}
                </>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs rounded-lg" onClick={() => navigate("/")}>
            <Home className="h-3.5 w-3.5 mr-1" />
            Home
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Pack Type Selection */}
          <div className="bg-accent/50 rounded-xl p-4 space-y-3">
            <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              Visual Style
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {PACK_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setPackType(option.value)}
                  disabled={isGenerating}
                  className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left ${
                    packType === option.value
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border/50 hover:border-border hover:bg-card'
                  } ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className={`${packType === option.value ? 'text-primary' : 'text-muted-foreground'}`}>
                    {option.icon}
                  </div>
                  <div>
                    <p className={`text-xs font-medium ${packType === option.value ? 'text-primary' : 'text-foreground'}`}>
                      {option.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{option.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Input Mode Tabs */}
          <div className="bg-accent/50 rounded-xl p-4">
            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "image" | "text")}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="image" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Reference Images
                </TabsTrigger>
                <TabsTrigger value="text" className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4" />
                  Creative Brief
                </TabsTrigger>
              </TabsList>

              <TabsContent value="image" className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Batch Upload (unlimited)</Label>
                  {images.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearAllImages} className="text-xs h-6" disabled={isGenerating}>
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear All
                    </Button>
                  )}
                </div>

                <label className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-border rounded-xl cursor-pointer hover:bg-card transition-colors">
                  <Upload className="h-5 w-5 text-muted-foreground mb-1.5" />
                  <span className="text-xs text-muted-foreground">Drop images or click to upload</span>
                  <span className="text-[10px] text-muted-foreground/70 mt-0.5">Parallel processing</span>
                  <input type="file" accept="image/*" multiple onChange={handleImagesUpload} className="hidden" disabled={isGenerating} />
                </label>

                {images.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {images.map(img => (
                      <div key={img.id} className="relative group">
                        <img
                          src={img.preview}
                          alt="Reference"
                          className={`w-full aspect-square object-cover rounded-lg border-2 ${
                            img.status === 'saved' ? 'border-green-500' :
                            img.status === 'success' ? 'border-blue-500' :
                            img.status === 'error' ? 'border-red-500' :
                            img.status === 'generating' ? 'border-yellow-500 animate-pulse' :
                            'border-border/50'
                          }`}
                        />
                        {img.status === 'generating' && (
                          <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                          </div>
                        )}
                        {img.status === 'saved' && (
                          <div className="absolute inset-0 bg-green-500/20 rounded-lg flex items-center justify-center">
                            <Check className="h-4 w-4 text-green-500" />
                          </div>
                        )}
                        {img.status === 'error' && (
                          <div className="absolute inset-0 bg-red-500/20 rounded-lg flex items-center justify-center">
                            <X className="h-4 w-4 text-red-500" />
                          </div>
                        )}
                        <button
                          onClick={() => removeImage(img.id)}
                          disabled={isGenerating}
                          className="absolute -top-1 -right-1 bg-background border border-border w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Phase 1: Pack generation progress */}
                {isGenerating && generationPhase === "creating-pack" && generatingCount > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3 animate-pulse text-primary" />
                        Phase 1: Creating packs... {completedCount} / {generatingCount}
                      </span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-1" />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="text" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Creative Brief</Label>
                  <Textarea
                    value={textPrompt}
                    onChange={(e) => setTextPrompt(e.target.value)}
                    placeholder="Describe the visual universe you want to create. Be specific about mood, era, influences, lighting quality, color palette, and the emotional transformation users should experience..."
                    className="min-h-32 resize-none"
                    disabled={isGenerating}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Tip: Reference specific photographers, film stocks, art movements, or eras for more cohesive results
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Pack Settings */}
          <div className="bg-accent/50 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-medium whitespace-nowrap">Scenes:</Label>
                <Select value={sceneCount.toString()} onValueChange={(v) => setSceneCount(parseInt(v))} disabled={isGenerating}>
                  <SelectTrigger className="w-24 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SCENE_COUNT_OPTIONS.map((count) => (
                      <SelectItem key={count} value={count.toString()}>{count} scenes</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Label className="text-xs font-medium whitespace-nowrap">Category:</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Portrait, Fashion..." disabled={isGenerating} className="w-32 h-9 text-sm" />
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-xs font-medium whitespace-nowrap">Gender:</Label>
                <Select value={gender} onValueChange={(v) => setGender(v as Gender)} disabled={isGenerating}>
                  <SelectTrigger className="w-24 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Advanced Settings Toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className={`h-3 w-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            </button>

            {showAdvanced && (
              <div className="space-y-3 pt-3 border-t border-border/30">
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-2"><Sparkles className="h-3 w-3" />Style Influences (max 3)</Label>
                  <div className="flex flex-wrap gap-2">
                    {STYLE_INFLUENCES.map((influence) => (
                      <Badge key={influence} variant={selectedInfluences.includes(influence) ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => toggleInfluence(influence)}>
                        {influence}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-2"><Sun className="h-3 w-3" />Lighting Preference</Label>
                  <div className="flex flex-wrap gap-2">
                    {LIGHTING_PRESETS.map((preset) => (
                      <Badge key={preset} variant={lightingPreference === preset ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => setLightingPreference(lightingPreference === preset ? "" : preset)}>
                        {preset}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-2"><Palette className="h-3 w-3" />Color Palette</Label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PALETTES.map((palette) => (
                      <Badge key={palette} variant={colorPalette === palette ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => setColorPalette(colorPalette === palette ? "" : palette)}>
                        {palette}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Auto-Render Toggle & Settings */}
          <div className="bg-accent/50 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-xs font-medium">Auto-Render Images</Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Automatically generate images for each scene after pack creation
                  </p>
                </div>
              </div>
              <Switch
                checked={autoRender}
                onCheckedChange={setAutoRender}
                disabled={isGenerating}
              />
            </div>

            {autoRender && (
              <div className="flex items-center gap-3 flex-wrap pt-3 border-t border-border/30">
                <div className="flex items-center gap-2">
                  <Label className="text-[11px] font-medium whitespace-nowrap text-muted-foreground">Model:</Label>
                  <Select value={renderModel} onValueChange={setRenderModel} disabled={isGenerating}>
                    <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RENDER_MODELS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          <span className="font-medium">{m.label}</span>
                          <span className="text-muted-foreground ml-1">— {m.description}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-[11px] font-medium whitespace-nowrap text-muted-foreground">Ratio:</Label>
                  <Select value={renderAspectRatio} onValueChange={setRenderAspectRatio} disabled={isGenerating}>
                    <SelectTrigger className="w-20 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ASPECT_RATIOS.map((ar) => (
                        <SelectItem key={ar} value={ar}>{ar}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-[11px] font-medium whitespace-nowrap text-muted-foreground">Res:</Label>
                  <Select value={renderResolution} onValueChange={setRenderResolution} disabled={isGenerating}>
                    <SelectTrigger className="w-20 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1K">1K</SelectItem>
                      <SelectItem value="2K">2K</SelectItem>
                      <SelectItem value="4K">4K</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || (inputMode === "image" ? images.filter(i => i.status === 'pending' || i.status === 'error').length === 0 : !textPrompt.trim())}
            className="w-full h-10 text-sm font-medium rounded-xl"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {generationPhase === "creating-pack" 
                  ? `Creating Visual Universe${generatingCount > 1 ? `s (${completedCount}/${generatingCount})` : ''}...`
                  : `Rendering Images (${totalRenderCompleted}/${totalRenderScenes})...`
                }
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                {inputMode === "image" 
                  ? `Generate ${images.filter(i => i.status === 'pending' || i.status === 'error').length} Pack(s) (${sceneCount} scenes each)`
                  : `Generate Style Pack (${sceneCount} scenes)`
                }
                {autoRender && " + Render"}
              </>
            )}
          </Button>

          {/* Phase 2: Render Progress */}
          {generationPhase === "rendering" && renderProgress.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="h-3 w-3 animate-pulse text-primary" />
                  Phase 2: Rendering images... {totalRenderCompleted} / {totalRenderScenes}
                </span>
                <span>{Math.round(renderPercent)}%</span>
              </div>
              <Progress value={renderPercent} className="h-1" />
            </div>
          )}

          {/* Render Results */}
          {renderProgress.length > 0 && (
            <div className="space-y-3">
              {renderProgress.map((rp) => (
                <div key={rp.packId} className="bg-accent/50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">{rp.packName}</Label>
                    <span className="text-[10px] text-muted-foreground">
                      {rp.completedScenes - rp.failedScenes}/{rp.totalScenes} rendered
                      {rp.failedScenes > 0 && <span className="text-destructive ml-1">({rp.failedScenes} failed)</span>}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {rp.sceneResults.map((sr) => (
                      <div key={sr.sceneId} className="relative aspect-[4/5] rounded-lg overflow-hidden border border-border/50 bg-card">
                        {sr.status === 'success' && sr.imageUrl ? (
                          <img src={sr.imageUrl} alt={`Scene ${sr.sceneId}`} className="w-full h-full object-cover" />
                        ) : sr.status === 'rendering' ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : sr.status === 'error' ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <X className="h-4 w-4 text-destructive" />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-[10px] text-muted-foreground">{sr.sceneId}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Generated Packs */}
          {generatedPacks.length > 0 && renderProgress.length === 0 && (
            <div className="bg-accent/50 rounded-xl p-4 space-y-3">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Generated Packs ({generatedPacks.length})</Label>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {generatedPacks.map((gen) => (
                  <div
                    key={gen.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border/50"
                  >
                    <div className="flex items-center gap-2.5">
                      {gen.saved ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-destructive" />
                      )}
                      <div>
                        <p className="text-xs font-medium">{getPackName(gen.pack)}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {getSceneCount(gen.pack)} scenes • {gen.pack.meta.category}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 text-xs rounded-lg" onClick={() => navigate("/")}>
                      View
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </AppLayout>
  );
}
