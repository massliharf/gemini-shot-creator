import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Upload, Wand2, Loader2, X, Check, Home, Camera, Box, 
  Sparkles, Palette, Sun, Layers, Eye, RefreshCw, Trash2
} from "lucide-react";
import type { PackFile } from "@/types/pack";
import { getPackId, getPackName, getSceneCount, hasScenes } from "@/types/pack";
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

const SCENE_COUNT_OPTIONS = [8, 12, 16, 20];

type PackType = "photography" | "god-eye" | "artist" | "eye" | "3d" | "artisto" | "reverse" | "portrait-clone" | "dop-architect" | "all-seeing-eye";
type Gender = "male" | "female" | "unisex";

const PACK_TYPE_OPTIONS: { value: PackType; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    value: "photography", 
    label: "Visual Architect", 
    icon: <Layers className="h-5 w-5" />,
    description: "7-layer detailed prompt architecture"
  },
  { 
    value: "god-eye", 
    label: "God-Eye Director", 
    icon: <Camera className="h-5 w-5" />,
    description: "2-layer concise style anchor system"
  },
  { 
    value: "artist", 
    label: "Artist v1", 
    icon: <Palette className="h-5 w-5" />,
    description: "Technical DNA + scene continuation"
  },
  { 
    value: "eye", 
    label: "Eye Director", 
    icon: <Eye className="h-5 w-5" />,
    description: "Complete photoshoot session - 12 moments"
  },
  { 
    value: "3d", 
    label: "3D Character", 
    icon: <Box className="h-5 w-5" />,
    description: "Render engine aesthetics"
  },
  { 
    value: "artisto", 
    label: "Artisto", 
    icon: <Sparkles className="h-5 w-5" />,
    description: "Art Director portrait style system"
  },
  { 
    value: "reverse", 
    label: "Reverse Engineer", 
    icon: <RefreshCw className="h-5 w-5" />,
    description: "Clone style from reference image"
  },
  { 
    value: "portrait-clone", 
    label: "Portrait Clone", 
    icon: <Camera className="h-5 w-5" />,
    description: "Style clone with close-up enforcement"
  },
  { 
    value: "dop-architect", 
    label: "DoP Architect", 
    icon: <Sun className="h-5 w-5" />,
    description: "Adaptive intelligence with wardrobe strategy"
  },
  { 
    value: "all-seeing-eye", 
    label: "All Seeing Eye", 
    icon: <Eye className="h-5 w-5" />,
    description: "God Mode visual engineering"
  },
];

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "unisex", label: "Unisex" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const LIGHTING_PRESETS = [
  "Natural window light",
  "Golden hour warmth",
  "Studio 3-point setup",
  "Dramatic chiaroscuro",
  "Soft diffused overcast",
  "Rim-lit silhouette",
  "Hard flash aesthetic",
  "Neon/colored gels",
];

const COLOR_PALETTES = [
  "Warm earth tones",
  "Cool blue shadows",
  "High contrast B&W",
  "Desaturated cinematic",
  "Vibrant saturated",
  "Film emulation (Portra)",
  "Film emulation (Kodachrome)",
  "Muted pastels",
];

const STYLE_INFLUENCES = [
  "Annie Leibovitz",
  "Peter Lindbergh",
  "Mario Testino",
  "Richard Avedon",
  "Helmut Newton",
  "Steven Meisel",
  "Tim Walker",
  "Paolo Roversi",
];

export default function PackCreator() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  
  // Generation state (transient, not persisted)
  const [isGenerating, setIsGenerating] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  
  // Persisted state from hook
  const {
    inputMode,
    textPrompt,
    packType,
    sceneCount,
    category,
    subcategory,
    gender,
    showAdvanced,
    selectedInfluences,
    lightingPreference,
    colorPalette,
    generatedPacks,
    images,
    setInputMode,
    setTextPrompt,
    setPackType,
    setSceneCount,
    setCategory,
    setSubcategory,
    setGender,
    setShowAdvanced,
    setSelectedInfluences,
    setLightingPreference,
    setColorPalette,
    setGeneratedPacks,
    setImages,
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
        : [...prev, influence].slice(0, 3) // Max 3
    );
  };

  const savePackToDatabase = async (pack: PackFile): Promise<boolean> => {
    if (!user) return false;

    const packId = getPackId(pack);
    const packName = getPackName(pack);

    if (!packId || !packName || !hasScenes(pack)) {
      console.error("Invalid pack structure");
      return false;
    }

    try {
      const { error } = await supabase
        .from('packs')
        .insert({
          pack_name: packName,
          pack_id: packId,
          pack_data: pack as any,
          user_id: user.id,
        });

      if (error) {
        console.error("Failed to save pack:", error);
        return false;
      }

      // Also store JSON in storage
      try {
        const jsonBlob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
        await supabase.storage
          .from("generated-images")
          .upload(`${packId}/pack.json`, jsonBlob, {
            upsert: true,
            contentType: "application/json",
          });
      } catch (e) {
        console.warn("Failed to upload pack.json to storage:", e);
      }

      return true;
    } catch (err) {
      console.error("Error saving pack:", err);
      return false;
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
              sceneCount,
              packType,
              gender,
              category,
              subcategory,
              styleInfluences: selectedInfluences,
              lightingPreference,
              colorPalette,
            },
          });

          if (error) throw error;

          // Handle both single pack and multiple packs response
          const packsToSave: PackFile[] = [];
          if (data.success && data.packs && Array.isArray(data.packs)) {
            packsToSave.push(...data.packs);
          } else if (data.success && data.pack) {
            packsToSave.push(data.pack as PackFile);
          }

          if (packsToSave.length === 0) {
            throw new Error(data.error || "Failed to create pack");
          }

          // Save all packs
          const savedResults = await Promise.all(
            packsToSave.map(async (pack) => {
              const saved = await savePackToDatabase(pack);
              return { pack, saved };
            })
          );
          
          setCompletedCount(prev => prev + 1);
          
          return { id: img.id, packs: savedResults };
        } catch (error) {
          setCompletedCount(prev => prev + 1);
          throw { id: img.id, error };
        }
      })
    );

    // Update all image statuses based on results
    let totalSavedCount = 0;
    let totalPackCount = 0;
    
    setImages(prev => prev.map(p => {
      const result = results.find(r => {
        if (r.status === "fulfilled") return r.value.id === p.id;
        if (r.status === "rejected") return r.reason?.id === p.id;
        return false;
      });

      if (!result) return p;

      if (result.status === "fulfilled") {
        const packsData = result.value.packs;
        totalPackCount += packsData.length;
        
        // Add all packs to generated packs list
        for (const { pack, saved } of packsData) {
          if (saved) totalSavedCount++;
          setGeneratedPacks(prevPacks => [{
            id: `${result.value.id}-${getPackId(pack)}`,
            pack,
            saved,
          }, ...prevPacks]);
        }

        const allSaved = packsData.every(pd => pd.saved);
        const firstPack = packsData[0]?.pack;
        
        return {
          ...p,
          status: allSaved ? 'saved' as const : 'success' as const,
          pack: firstPack,
        };
      } else {
        return {
          ...p,
          status: 'error' as const,
          error: result.reason?.error?.message || "Unknown error",
        };
      }
    }));

    setIsGenerating(false);

    const successImageCount = results.filter(r => r.status === "fulfilled").length;
    const failCount = results.filter(r => r.status === "rejected").length;

    if (totalSavedCount > 0) {
      toast.success(`${totalSavedCount} pack(s) created and saved!`);
    } else if (successImageCount > 0) {
      toast.warning(`${totalPackCount} pack(s) created but not saved`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} image(s) failed`);
    }
  };

  const handleGenerateText = async () => {
    if (!textPrompt.trim()) {
      toast.error("Please enter a creative brief");
      return;
    }

    setIsGenerating(true);
    const genId = `gen-${Date.now()}`;

    try {
      const { data, error } = await supabase.functions.invoke("generate-pack-v2", {
        body: {
          textPrompt,
          sceneCount,
          packType,
          gender,
          category,
          subcategory,
          styleInfluences: selectedInfluences,
          lightingPreference,
          colorPalette,
        },
      });

      if (error) throw error;

      // Handle both single pack and multiple packs response
      const packsToSave: PackFile[] = [];
      if (data.success && data.packs && Array.isArray(data.packs)) {
        packsToSave.push(...data.packs);
      } else if (data.success && data.pack) {
        packsToSave.push(data.pack as PackFile);
      }

      if (packsToSave.length === 0) {
        throw new Error(data.error || "Failed to create pack");
      }

      let savedCount = 0;
      for (const pack of packsToSave) {
        const saved = await savePackToDatabase(pack);
        if (saved) savedCount++;

        setGeneratedPacks(prev => [{
          id: `${genId}-${getPackId(pack)}`,
          pack,
          saved,
        }, ...prev]);
      }

      toast.success(savedCount > 0 ? `${savedCount} pack(s) created and saved!` : "Pack(s) created (save failed)");
    } catch (error) {
      console.error("Generation error:", error);
      toast.error(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setIsGenerating(false);
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
                {/* Upload Area */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Batch Upload (unlimited)</Label>
                  {images.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearAllImages} 
                      className="text-xs h-6" 
                      disabled={isGenerating}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear All
                    </Button>
                  )}
                </div>

                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border/50 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Drop images or click to upload</span>
                  <span className="text-xs text-muted-foreground/70 mt-1">Upload as many as you want - parallel processing</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImagesUpload}
                    className="hidden"
                    disabled={isGenerating}
                  />
                </label>

                {/* Image Grid */}
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

                {/* Progress */}
                {isGenerating && generatingCount > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span>Generating in parallel... {completedCount} / {generatingCount}</span>
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
          </Card>

          {/* Pack Settings */}
          <Card className="p-4 border-border/50 space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-medium whitespace-nowrap">Scenes:</Label>
                <Select
                  value={sceneCount.toString()}
                  onValueChange={(v) => setSceneCount(parseInt(v))}
                  disabled={isGenerating}
                >
                  <SelectTrigger className="w-24 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCENE_COUNT_OPTIONS.map((count) => (
                      <SelectItem key={count} value={count.toString()}>
                        {count} scenes
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Label className="text-xs font-medium whitespace-nowrap">Category:</Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Portrait, Fashion..."
                  disabled={isGenerating}
                  className="w-32 h-9 text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-xs font-medium whitespace-nowrap">Gender:</Label>
                <Select
                  value={gender}
                  onValueChange={(v) => setGender(v as Gender)}
                  disabled={isGenerating}
                >
                  <SelectTrigger className="w-24 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
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
              <div className="space-y-4 pt-2 border-t border-border/50">
                {/* Style Influences */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-2">
                    <Sparkles className="h-3 w-3" />
                    Style Influences (max 3)
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {STYLE_INFLUENCES.map((influence) => (
                      <Badge
                        key={influence}
                        variant={selectedInfluences.includes(influence) ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => toggleInfluence(influence)}
                      >
                        {influence}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Lighting Preference */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-2">
                    <Sun className="h-3 w-3" />
                    Lighting Preference
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {LIGHTING_PRESETS.map((preset) => (
                      <Badge
                        key={preset}
                        variant={lightingPreference === preset ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => setLightingPreference(lightingPreference === preset ? "" : preset)}
                      >
                        {preset}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Color Palette */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-2">
                    <Palette className="h-3 w-3" />
                    Color Palette
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PALETTES.map((palette) => (
                      <Badge
                        key={palette}
                        variant={colorPalette === palette ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => setColorPalette(colorPalette === palette ? "" : palette)}
                      >
                        {palette}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || (inputMode === "image" ? images.filter(i => i.status === 'pending' || i.status === 'error').length === 0 : !textPrompt.trim())}
            className="w-full h-12 text-base font-medium"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating Visual Universe{generatingCount > 1 ? `s (${completedCount}/${generatingCount})` : ''}...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                {inputMode === "image" 
                  ? `Generate ${images.filter(i => i.status === 'pending' || i.status === 'error').length} Pack(s) (${sceneCount} scenes each)`
                  : `Generate Style Pack (${sceneCount} scenes)`
                }
              </>
            )}
          </Button>

          {/* Generated Packs */}
          {generatedPacks.length > 0 && (
            <Card className="p-4 border-border/50 space-y-3">
              <Label className="text-sm font-medium">Generated Packs ({generatedPacks.length})</Label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {generatedPacks.map((gen) => (
                  <div
                    key={gen.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      {gen.saved ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{getPackName(gen.pack)}</p>
                        <p className="text-xs text-muted-foreground">
                          {getSceneCount(gen.pack)} scenes • {gen.pack.meta.category}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate("/")}
                    >
                      View
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </main>
    </AppLayout>
  );
}
