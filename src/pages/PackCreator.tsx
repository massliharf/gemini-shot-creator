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

type PackType = "photography" | "god-eye" | "artist" | "eye" | "3d";
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
    label: "Eye", 
    icon: <Eye className="h-5 w-5" />,
    description: "Photoshoot session with 12 moments"
  },
  { 
    value: "3d", 
    label: "3D Character", 
    icon: <Box className="h-5 w-5" />,
    description: "Render engine aesthetics"
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
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [generatedPacks, setGeneratedPacks] = useState<GeneratedPack[]>([]);
  
  // Input mode
  const [inputMode, setInputMode] = useState<"image" | "text">("image");
  
  // Batch image input
  const [images, setImages] = useState<UploadedImage[]>([]);
  
  // Text input
  const [textPrompt, setTextPrompt] = useState("");
  
  // Pack settings
  const [packType, setPackType] = useState<PackType>("photography");
  const [sceneCount, setSceneCount] = useState<number>(12);
  const [category, setCategory] = useState<string>("Portrait");
  const [subcategory, setSubcategory] = useState<string>("");
  const [gender, setGender] = useState<Gender>("unisex");
  
  // Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedInfluences, setSelectedInfluences] = useState<string[]>([]);
  const [lightingPreference, setLightingPreference] = useState<string>("");
  const [colorPalette, setColorPalette] = useState<string>("");

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

          if (data.success && data.pack) {
            const pack = data.pack as PackFile;
            const saved = await savePackToDatabase(pack);
            
            setCompletedCount(prev => prev + 1);
            
            return { id: img.id, pack, saved };
          } else {
            throw new Error(data.error || "Failed to create pack");
          }
        } catch (error) {
          setCompletedCount(prev => prev + 1);
          throw { id: img.id, error };
        }
      })
    );

    // Update all image statuses based on results
    setImages(prev => prev.map(p => {
      const result = results.find(r => {
        if (r.status === "fulfilled") return r.value.id === p.id;
        if (r.status === "rejected") return r.reason?.id === p.id;
        return false;
      });

      if (!result) return p;

      if (result.status === "fulfilled") {
        // Add to generated packs list
        setGeneratedPacks(prevPacks => [{
          id: result.value.id,
          pack: result.value.pack,
          saved: result.value.saved,
        }, ...prevPacks]);

        return {
          ...p,
          status: result.value.saved ? 'saved' as const : 'success' as const,
          pack: result.value.pack,
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

    const successCount = results.filter(r => r.status === "fulfilled").length;
    const savedCount = results.filter(r => r.status === "fulfilled" && r.value.saved).length;
    const failCount = results.filter(r => r.status === "rejected").length;

    if (savedCount > 0) {
      toast.success(`${savedCount} pack(s) created and saved!`);
    } else if (successCount > 0) {
      toast.warning(`${successCount} pack(s) created but not saved`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} pack(s) failed`);
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

      if (data.success && data.pack) {
        const pack = data.pack as PackFile;
        const saved = await savePackToDatabase(pack);

        setGeneratedPacks(prev => [{
          id: genId,
          pack,
          saved,
        }, ...prev]);

        toast.success(saved ? "Pack created and saved!" : "Pack created (save failed)");
      } else {
        throw new Error(data.error || "Failed to create pack");
      }
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
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">
                {packType === "god-eye" ? "God-Eye Photography Director" : 
                 packType === "artist" ? "Artist v1" :
                 packType === "eye" ? "Eye Portrait Director" :
                 packType === "3d" ? "3D Visual Architect" : 
                 "Omniscient Visual Architect"}
              </h1>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span>
                {packType === "god-eye" ? "2-layer style system" : 
                 packType === "artist" ? "Technical DNA + scene continuation" :
                 packType === "eye" ? "Photoshoot session logic" :
                 packType === "3d" ? "Render engine aesthetics" : 
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
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <Home className="h-4 w-4 mr-1" />
            Home
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Pack Type Selection */}
          <Card className="p-4 border-border/50 space-y-4">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Visual Style
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PACK_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setPackType(option.value)}
                  disabled={isGenerating}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    packType === option.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border/50 hover:border-border hover:bg-muted/50'
                  } ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className={`p-2 rounded-lg ${packType === option.value ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {option.icon}
                  </div>
                  <div className="text-left">
                    <p className={`font-medium ${packType === option.value ? 'text-primary' : ''}`}>
                      {option.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{option.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Input Mode Tabs */}
          <Card className="p-4 border-border/50">
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
