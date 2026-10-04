import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
  ImageIcon, Play, Film, ShoppingBag, CheckCircle2, XCircle, ChevronDown
} from "lucide-react";
import type { PackFile } from "@/types/pack";
import { getPackId, getPackName, getSceneCount, hasScenes, buildFinalPrompt, getConfig, getScenes } from "@/types/pack";
import { AppLayout } from "@/components/AppLayout";
import { User } from "@supabase/supabase-js";
import { usePackCreatorState } from "@/hooks/usePackCreatorState";
import { isDemoMode } from "@/lib/demo";
import { ResultGroup, SamplePackGrid, ToolHeader } from "@/components/results";

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

type PackType = "photography" | "god-eye" | "artist" | "eye" | "3d" | "artisto" | "reverse" | "portrait-clone" | "dop-architect" | "all-seeing-eye" | "creative" | "product" | "glamour";
type Gender = "male" | "female" | "unisex";

const PACK_TYPE_OPTIONS: { value: PackType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: "glamour", label: "Glamour Portrait", icon: <Sparkles className="size-5" strokeWidth={1.75} aria-hidden="true" />, description: "Deep reference analysis + artistic fashion scenes" },
  { value: "creative", label: "Creative Scene", icon: <Film className="size-5" strokeWidth={1.75} aria-hidden="true" />, description: "Full creative freedom - any composition" },
  { value: "product", label: "Product Shot", icon: <ShoppingBag className="size-5" strokeWidth={1.75} aria-hidden="true" />, description: "Product/object photography" },
  { value: "photography", label: "Visual Architect", icon: <Layers className="size-5" strokeWidth={1.75} aria-hidden="true" />, description: "7-layer portrait architecture" },
  { value: "god-eye", label: "God-Eye Director", icon: <Camera className="size-5" strokeWidth={1.75} aria-hidden="true" />, description: "2-layer concise style system" },
  { value: "artist", label: "Artist v1", icon: <Palette className="size-5" strokeWidth={1.75} aria-hidden="true" />, description: "Technical DNA + scene continuation" },
  { value: "eye", label: "Eye Director", icon: <Eye className="size-5" strokeWidth={1.75} aria-hidden="true" />, description: "Complete photoshoot session" },
  { value: "3d", label: "3D Character", icon: <Box className="size-5" strokeWidth={1.75} aria-hidden="true" />, description: "Render engine aesthetics" },
  { value: "artisto", label: "Artisto", icon: <Sparkles className="size-5" strokeWidth={1.75} aria-hidden="true" />, description: "Art Director portrait system" },
  { value: "reverse", label: "Reverse Engineer", icon: <RefreshCw className="size-5" strokeWidth={1.75} aria-hidden="true" />, description: "Clone style from reference" },
  { value: "portrait-clone", label: "Portrait Clone", icon: <Camera className="size-5" strokeWidth={1.75} aria-hidden="true" />, description: "Close-up enforcement clone" },
  { value: "dop-architect", label: "DoP Architect", icon: <Sun className="size-5" strokeWidth={1.75} aria-hidden="true" />, description: "Adaptive wardrobe strategy" },
  { value: "all-seeing-eye", label: "All Seeing Eye", icon: <Eye className="size-5" strokeWidth={1.75} aria-hidden="true" />, description: "God Mode visual engineering" },
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
    customPrompt, generatedPacks, images, autoRender, renderModel, renderAspectRatio, renderResolution,
    setInputMode, setTextPrompt, setPackType, setSceneCount, setCategory, setSubcategory,
    setGender, setShowAdvanced, setSelectedInfluences, setLightingPreference, setColorPalette,
    setCustomPrompt, setGeneratedPacks, setImages, setAutoRender, setRenderModel, setRenderAspectRatio, setRenderResolution,
  } = usePackCreatorState();

  // Templates link here with ?prompt=…: put it in the creative brief, then drop the param
  // so the same template can be applied again and a reload doesn't overwrite later edits.
  const [searchParams, setSearchParams] = useSearchParams();
  const promptParam = searchParams.get("prompt");
  useEffect(() => {
    if (!promptParam) return;
    setInputMode("text");
    setTextPrompt(promptParam);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("prompt");
        return next;
      },
      { replace: true },
    );
  }, [promptParam, setInputMode, setTextPrompt, setSearchParams]);

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
              customPrompt,
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
          customPrompt,
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

  const pendingOrErrorCount = images.filter(i => i.status === 'pending' || i.status === 'error').length;
  const chipClass = (selected: boolean) =>
    `cursor-pointer select-none hover:bg-control-hover focus-visible:ring-offset-card ${selected ? 'bg-active ring-1 ring-foreground/80' : ''}`;

  return (
    <AppLayout userEmail={userEmail}>
      <main className="flex-1 min-h-0 bg-background flex flex-col md:flex-row gap-3 p-3 overflow-y-auto md:overflow-hidden">
        {/* ===== Left tool panel ===== */}
        <aside
          className="w-full md:w-tool-panel shrink-0 bg-card rounded-lg flex flex-col md:min-h-0 md:h-full md:overflow-hidden"
          aria-label="Pack Creator settings"
        >
          <div className="md:flex-1 md:min-h-0 md:overflow-y-auto p-3 space-y-5">
            {/* Tool title card */}
            <ToolHeader
              icon={Sparkles}
              category="spaces"
              title="Pack Creator"
              badge={autoRender && (
                <Badge variant="default" className="shrink-0">
                  <Play aria-hidden="true" />
                  Auto-render
                </Badge>
              )}
              actions={
                <Button type="button" variant="ghost" size="icon-sm" className="shrink-0 -mr-1" onClick={() => navigate("/")} aria-label="Home" title="Home">
                  <Home strokeWidth={1.5} aria-hidden="true" />
                </Button>
              }
              description={<>
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
                  {" · "}
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
              </>}
            />

            {/* VISUAL STYLE */}
            <section className="space-y-2" aria-labelledby="pack-style-heading">
              <Label id="pack-style-heading" asChild>
                <span>Visual style</span>
              </Label>
              <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-labelledby="pack-style-heading">
                {PACK_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={packType === option.value}
                    onClick={() => setPackType(option.value)}
                    disabled={isGenerating}
                    title={option.description}
                    className={`flex items-center gap-2 h-control-lg md:h-control-md px-2 rounded-md text-left transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:text-tertiary-foreground disabled:cursor-not-allowed ${
                      packType === option.value
                        ? 'bg-active ring-1 ring-foreground/80 text-foreground'
                        : 'bg-control hover:bg-control-hover text-muted-foreground'
                    }`}
                  >
                    <span className="shrink-0 [&_svg]:size-4" aria-hidden="true">
                      {option.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-label-md text-foreground truncate">{option.label}</span>
                      <span className="sr-only">{option.description}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* INPUT */}
            <section className="space-y-2" aria-labelledby="pack-input-heading">
              <Label id="pack-input-heading" asChild>
                <span>Input</span>
              </Label>
              <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "image" | "text")}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="image" className="flex items-center gap-1.5">
                    <Eye className="size-4" strokeWidth={1.5} aria-hidden="true" />
                    References
                  </TabsTrigger>
                  <TabsTrigger value="text" className="flex items-center gap-1.5">
                    <Wand2 className="size-4" strokeWidth={1.5} aria-hidden="true" />
                    Brief
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="image" className="mt-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="pack-batch-upload">References</Label>
                    {images.length > 0 && (
                      <Button type="button" variant="ghost" size="xs" onClick={clearAllImages} disabled={isGenerating}>
                        <Trash2 strokeWidth={1.5} aria-hidden="true" />
                        Clear all
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <label
                      htmlFor="pack-batch-upload"
                      className="dropzone size-[65px] shrink-0 flex flex-col items-center justify-center gap-1 cursor-pointer text-muted-foreground hover:text-foreground focus-within:ring-2 focus-within:ring-ring"
                    >
                      <Upload className="size-4" strokeWidth={1.5} aria-hidden="true" />
                      <span className="text-caption">Add</span>
                      <input id="pack-batch-upload" type="file" accept="image/*" multiple onChange={handleImagesUpload} className="sr-only" disabled={isGenerating} />
                    </label>

                    {images.length > 0 && (
                      <ul className="contents list-none m-0 p-0">
                        {images.map(img => (
                          <li key={img.id} className="relative group size-[65px] shrink-0">
                            <img
                              src={img.preview}
                              alt="Reference"
                              className={`size-full object-cover rounded-md ${
                                img.status === 'saved' ? 'ring-1 ring-success' :
                                img.status === 'success' ? 'ring-1 ring-info' :
                                img.status === 'error' ? 'ring-1 ring-destructive' :
                                img.status === 'generating' ? 'ring-1 ring-warning animate-pulse' :
                                ''
                              }`}
                            />
                            {img.status === 'generating' && (
                              <div className="absolute inset-0 bg-foreground/25 rounded-md flex items-center justify-center" aria-label="Generating" role="img">
                                <Loader2 className="size-4 animate-spin text-white" strokeWidth={1.5} aria-hidden="true" />
                              </div>
                            )}
                            {img.status === 'saved' && (
                              <div className="absolute inset-0 bg-success/20 rounded-md flex items-center justify-center" aria-label="Saved" role="img">
                                <CheckCircle2 className="size-4 text-success" strokeWidth={1.5} aria-hidden="true" />
                              </div>
                            )}
                            {img.status === 'error' && (
                              <div className="absolute inset-0 bg-destructive/20 rounded-md flex items-center justify-center" aria-label="Failed" role="img">
                                <XCircle className="size-4 text-destructive" strokeWidth={1.5} aria-hidden="true" />
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => removeImage(img.id)}
                              disabled={isGenerating}
                              aria-label="Remove image"
                              className="absolute -top-1.5 -right-1.5 bg-card/90 text-foreground size-5 rounded-full flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:text-tertiary-foreground"
                            >
                              <X className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <p className="text-caption text-muted-foreground">Drop images or click to upload · parallel processing</p>

                  {/* Phase 1: Pack generation progress */}
                  {isGenerating && generationPhase === "creating-pack" && generatingCount > 0 && (
                    <div className="space-y-1.5" aria-live="polite">
                      <div className="flex items-center justify-between text-caption">
                        <span className="flex items-center gap-1.5 text-foreground">
                          <Loader2 className="size-3.5 animate-spin" strokeWidth={1.5} aria-hidden="true" />
                          Creating packs… {completedCount} / {generatingCount}
                        </span>
                        <span className="text-muted-foreground tabular-nums">{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="text" className="mt-3 space-y-2">
                  <Label htmlFor="pack-text-prompt">Creative brief</Label>
                  <Textarea
                    id="pack-text-prompt"
                    value={textPrompt}
                    onChange={(e) => setTextPrompt(e.target.value)}
                    placeholder="Describe the visual universe you want to create. Be specific about mood, era, influences, lighting quality, color palette, and the emotional transformation users should experience..."
                    className="min-h-28"
                    disabled={isGenerating}
                    aria-describedby="pack-text-prompt-help"
                  />
                  <p id="pack-text-prompt-help" className="text-caption text-muted-foreground">
                    Tip: Reference specific photographers, film stocks, art movements, or eras for more cohesive results
                  </p>
                </TabsContent>
              </Tabs>
            </section>

            {/* SCENES / CATEGORY / GENDER */}
            <section className="space-y-3" aria-label="Pack settings">
              <div className="space-y-1.5">
                <Label htmlFor="pack-scene-count">Scenes</Label>
                <Select value={sceneCount.toString()} onValueChange={(v) => setSceneCount(parseInt(v))} disabled={isGenerating}>
                  <SelectTrigger id="pack-scene-count" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SCENE_COUNT_OPTIONS.map((count) => (
                      <SelectItem key={count} value={count.toString()}>{count} scenes</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pack-category">Category</Label>
                <Input id="pack-category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Portrait, Fashion..." disabled={isGenerating} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pack-gender">Gender</Label>
                <Select value={gender} onValueChange={(v) => setGender(v as Gender)} disabled={isGenerating}>
                  <SelectTrigger id="pack-gender" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Advanced Settings Toggle */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                aria-expanded={showAdvanced}
                aria-controls="pack-advanced-options"
                className="-ml-3"
              >
                <ChevronDown className={`transition-transform duration-normal ease-standard ${showAdvanced ? 'rotate-180' : ''}`} strokeWidth={1.5} aria-hidden="true" />
                {showAdvanced ? 'Hide' : 'Show'} advanced options
              </Button>

              {showAdvanced && (
                <div id="pack-advanced-options" className="space-y-4">
                  <div className="space-y-2" role="group" aria-labelledby="pack-influences-label">
                    <div className="flex items-center justify-between gap-2">
                      <Label id="pack-influences-label" asChild>
                        <span>Style influences</span>
                      </Label>
                      <span className="text-caption text-muted-foreground tabular-nums">{selectedInfluences.length}/3</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {STYLE_INFLUENCES.map((influence) => (
                        <Badge
                          key={influence}
                          variant="default"
                          role="checkbox"
                          aria-checked={selectedInfluences.includes(influence)}
                          tabIndex={0}
                          className={chipClass(selectedInfluences.includes(influence))}
                          onClick={() => toggleInfluence(influence)}
                        >
                          {selectedInfluences.includes(influence) && <Check aria-hidden="true" />}
                          {influence}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2" role="group" aria-labelledby="pack-lighting-label">
                    <Label id="pack-lighting-label" asChild>
                      <span>Lighting</span>
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {LIGHTING_PRESETS.map((preset) => (
                        <Badge
                          key={preset}
                          variant="default"
                          role="radio"
                          aria-checked={lightingPreference === preset}
                          tabIndex={0}
                          className={chipClass(lightingPreference === preset)}
                          onClick={() => setLightingPreference(lightingPreference === preset ? "" : preset)}
                        >
                          {lightingPreference === preset && <Check aria-hidden="true" />}
                          {preset}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2" role="group" aria-labelledby="pack-palette-label">
                    <Label id="pack-palette-label" asChild>
                      <span>Color palette</span>
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {COLOR_PALETTES.map((palette) => (
                        <Badge
                          key={palette}
                          variant="default"
                          role="radio"
                          aria-checked={colorPalette === palette}
                          tabIndex={0}
                          className={chipClass(colorPalette === palette)}
                          onClick={() => setColorPalette(colorPalette === palette ? "" : palette)}
                        >
                          {colorPalette === palette && <Check aria-hidden="true" />}
                          {palette}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* PROMPT DIRECTION */}
            <section className="space-y-1.5" aria-labelledby="pack-custom-prompt-heading">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="pack-custom-prompt" id="pack-custom-prompt-heading">Prompt direction</Label>
                <span className="text-caption text-muted-foreground">Optional</span>
              </div>
              <Textarea
                id="pack-custom-prompt"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Write your own prompt style/tone here. AI will generate scene prompts following this direction. Example: 'elegant boudoir style, soft fabrics, warm intimate lighting, artistic poses...'"
                className="min-h-24"
                disabled={isGenerating}
                aria-describedby="pack-custom-prompt-help"
              />
              <p id="pack-custom-prompt-help" className="text-caption text-muted-foreground">
                Bu alanı doldurursanız AI tüm sahneleri bu yönlendirmeye göre üretir. Boş bırakırsanız seçili protokolün varsayılan stili kullanılır.
              </p>
            </section>

            {/* OPTIONS: Auto-render */}
            <section className="space-y-3" aria-labelledby="pack-autorender-heading">
              <Label asChild>
                <span>Options</span>
              </Label>
              <div className="flex items-center justify-between gap-3 bg-control rounded-md px-3 min-h-control-md">
                <div className="flex items-center gap-2 min-w-0">
                  <ImageIcon className="size-4 text-muted-foreground shrink-0" strokeWidth={1.5} aria-hidden="true" />
                  <label htmlFor="pack-auto-render" id="pack-autorender-heading" className="text-label-md text-foreground truncate cursor-pointer">
                    Auto-render images
                  </label>
                </div>
                <Switch
                  id="pack-auto-render"
                  checked={autoRender}
                  onCheckedChange={setAutoRender}
                  disabled={isGenerating}
                />
              </div>
              <p className="text-caption text-muted-foreground">Automatically generate images for each scene after pack creation</p>

              {autoRender && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="pack-render-model">Model</Label>
                    <Select value={renderModel} onValueChange={setRenderModel} disabled={isGenerating}>
                      <SelectTrigger id="pack-render-model" className="w-full"><SelectValue /></SelectTrigger>
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

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="pack-render-ratio">Aspect ratio</Label>
                      <Select value={renderAspectRatio} onValueChange={setRenderAspectRatio} disabled={isGenerating}>
                        <SelectTrigger id="pack-render-ratio" className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ASPECT_RATIOS.map((ar) => (
                            <SelectItem key={ar} value={ar}>{ar}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="pack-render-resolution">Resolution</Label>
                      <Select value={renderResolution} onValueChange={setRenderResolution} disabled={isGenerating}>
                        <SelectTrigger id="pack-render-resolution" className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1K">1K</SelectItem>
                          <SelectItem value="2K">2K</SelectItem>
                          <SelectItem value="4K">4K</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Sticky Generate — single black primary */}
          <div className="sticky bottom-0 bg-card/95 backdrop-blur p-3 safe-bottom space-y-2 rounded-b-lg">
            {/* Phase 2: Render Progress */}
            {generationPhase === "rendering" && renderProgress.length > 0 && (
              <div className="space-y-1.5" aria-live="polite">
                <div className="flex items-center justify-between text-caption">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <Loader2 className="size-3.5 animate-spin" strokeWidth={1.5} aria-hidden="true" />
                    Rendering images… {totalRenderCompleted} / {totalRenderScenes}
                  </span>
                  <span className="text-muted-foreground tabular-nums">{Math.round(renderPercent)}%</span>
                </div>
                <Progress value={renderPercent} className="h-1.5" />
              </div>
            )}

            <Button
              type="button"
              variant="primary"
              onClick={handleGenerate}
              disabled={isGenerating || (inputMode === "image" ? images.filter(i => i.status === 'pending' || i.status === 'error').length === 0 : !textPrompt.trim())}
              fullWidth
              size="lg"
              aria-busy={isGenerating || undefined}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" strokeWidth={1.5} aria-hidden="true" />
                  {generationPhase === "creating-pack"
                    ? `Creating Visual Universe${generatingCount > 1 ? `s (${completedCount}/${generatingCount})` : ''}...`
                    : `Rendering Images (${totalRenderCompleted}/${totalRenderScenes})...`
                  }
                </>
              ) : (
                <>
                  {inputMode === "image"
                    ? `Generate ${images.filter(i => i.status === 'pending' || i.status === 'error').length} Pack(s) (${sceneCount} scenes each)`
                    : `Generate Style Pack (${sceneCount} scenes)`
                  }
                  {autoRender && " + Render"}
                  <Sparkles strokeWidth={1.5} aria-hidden="true" />
                </>
              )}
            </Button>
          </div>
        </aside>

        {/* ===== Results feed ===== */}
        <section className="flex-1 min-w-0 md:min-h-0 md:overflow-y-auto space-y-3" aria-label="Results">
          {/* Feed header: counts */}
          <div className="flex items-center justify-between gap-2 flex-wrap px-1">
            <h2 className="text-heading-md text-foreground">Results</h2>
            <div className="flex items-center gap-1.5 flex-wrap">
              {images.length > 0 && (
                <>
                  <Badge variant="default">
                    <ImageIcon aria-hidden="true" />
                    {images.length} images
                  </Badge>
                  {savedCount > 0 && (
                    <Badge variant="success">
                      <CheckCircle2 aria-hidden="true" />
                      {savedCount} saved
                    </Badge>
                  )}
                  {errorCount > 0 && (
                    <Badge variant="danger">
                      <XCircle aria-hidden="true" />
                      {errorCount} failed
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Empty state — sample packs only exist in the demo workspace, so "View pack" is demo-only */}
          {renderProgress.length === 0 && generatedPacks.length === 0 && (
            <SamplePackGrid
              notice={pendingOrErrorCount > 0
                ? `${pendingOrErrorCount} reference(s) ready — generate to start.`
                : "Add references or write a brief — your packs will appear here."}
              onOpenPack={isDemoMode() ? (p) => navigate(`/?pack=${encodeURIComponent(p.id)}`) : undefined}
              latestRender
            />
          )}

          {/* Render Results */}
          {renderProgress.length > 0 && (
            <div className="space-y-3" aria-label="Render results">
              {renderProgress.map((rp) => (
                <ResultGroup
                  key={rp.packId}
                  title={rp.packName}
                  meta={[`${rp.totalScenes} scenes`, renderAspectRatio, renderResolution]}
                  status={<>
                    <span className="text-caption text-muted-foreground tabular-nums whitespace-nowrap">
                      {rp.completedScenes - rp.failedScenes}/{rp.totalScenes} rendered
                    </span>
                    {rp.failedScenes > 0 && (
                      <Badge variant="danger">
                        <XCircle aria-hidden="true" />
                        {rp.failedScenes} failed
                      </Badge>
                    )}
                  </>}
                >
                  <ul className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 list-none m-0 p-0">
                    {rp.sceneResults.map((sr) => (
                      <li key={sr.sceneId} className="relative aspect-[4/5] rounded-md overflow-hidden bg-control">
                        {sr.status === 'success' && sr.imageUrl ? (
                          <img src={sr.imageUrl} alt={`Scene ${sr.sceneId}`} className="w-full h-full object-cover" />
                        ) : sr.status === 'rendering' ? (
                          <div className="w-full h-full skeleton flex items-center justify-center" aria-label="Rendering" role="img">
                            <Loader2 className="size-4 animate-spin text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
                          </div>
                        ) : sr.status === 'error' ? (
                          <div className="w-full h-full flex items-center justify-center bg-danger-bg" aria-label="Render failed" role="img">
                            <XCircle className="size-5 text-destructive" strokeWidth={1.5} aria-hidden="true" />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-caption text-tertiary-foreground">{sr.sceneId}</span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </ResultGroup>
              ))}
            </div>
          )}

          {/* Generated Packs */}
          {generatedPacks.length > 0 && renderProgress.length === 0 && (
            <article className="bg-app rounded-lg p-4 space-y-3" aria-labelledby="pack-generated-heading">
              <div className="flex items-center justify-between gap-2">
                <h3 id="pack-generated-heading" className="text-label-md text-foreground truncate">Generated packs</h3>
                <span className="text-caption text-muted-foreground tabular-nums">{generatedPacks.length}</span>
              </div>
              <ul className="space-y-0.5 list-none m-0 p-0">
                {generatedPacks.map((gen) => (
                  <li
                    key={gen.id}
                    className="flex items-center justify-between gap-3 min-h-control-md px-2 py-1 rounded-md bg-card hover:bg-control-hover transition-colors duration-fast ease-standard"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {gen.saved ? (
                        <CheckCircle2 className="size-4 text-success shrink-0" strokeWidth={1.5} aria-label="Saved" role="img" />
                      ) : (
                        <XCircle className="size-4 text-destructive shrink-0" strokeWidth={1.5} aria-label="Not saved" role="img" />
                      )}
                      <div className="min-w-0">
                        <p className="text-label-md text-foreground truncate">{getPackName(gen.pack)}</p>
                        <p className="text-caption text-muted-foreground truncate">
                          {getSceneCount(gen.pack)} scenes · {gen.pack.meta.category}
                        </p>
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={() => navigate("/")}>
                      View
                    </Button>
                  </li>
                ))}
              </ul>
            </article>
          )}
        </section>
      </main>
    </AppLayout>
  );
}

// TODO(magnific): Style influence / lighting / palette chips are clickable <Badge>s (div) with role + tabIndex added;
// they need onKeyDown (Enter/Space) handlers to be fully keyboard operable, which is a logic change.
// TODO(magnific): The Generate button label mixes Title Case ("Generate Style Pack", "Creating Visual Universe");
// left as-is because the text is built from template strings tied to state.
