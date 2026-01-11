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
  Sparkles, Palette, Sun, Layers, Eye, RefreshCw
} from "lucide-react";
import type { PackFile } from "@/types/pack";
import { getPackId, getPackName, getSceneCount, hasScenes } from "@/types/pack";
import { AppLayout } from "@/components/AppLayout";
import { User } from "@supabase/supabase-js";

interface GeneratedPack {
  id: string;
  pack: PackFile;
  saved: boolean;
  error?: string;
}

const SCENE_COUNT_OPTIONS = [8, 12, 16, 20];

type PackType = "photography" | "3d";
type Gender = "male" | "female" | "unisex";

const PACK_TYPE_OPTIONS: { value: PackType; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    value: "photography", 
    label: "Photography", 
    icon: <Camera className="h-5 w-5" />,
    description: "7-layer prompt architecture with face-blind technique"
  },
  { 
    value: "3d", 
    label: "3D Character", 
    icon: <Box className="h-5 w-5" />,
    description: "Render engine aesthetics with material consistency"
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
  const [generatedPacks, setGeneratedPacks] = useState<GeneratedPack[]>([]);
  
  // Input mode
  const [inputMode, setInputMode] = useState<"image" | "text">("image");
  
  // Image input
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    const preview = URL.createObjectURL(file);
    setImagePreview(preview);

    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      setImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setImageBase64(null);
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

  const handleGenerate = async () => {
    // Validate inputs
    if (inputMode === "image" && !imageBase64) {
      toast.error("Please upload a reference image");
      return;
    }
    if (inputMode === "text" && !textPrompt.trim()) {
      toast.error("Please enter a creative brief");
      return;
    }

    setIsGenerating(true);
    const genId = `gen-${Date.now()}`;

    try {
      const { data, error } = await supabase.functions.invoke("generate-pack-v2", {
        body: {
          imageBase64: inputMode === "image" ? imageBase64 : undefined,
          textPrompt: inputMode === "text" ? textPrompt : undefined,
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

  if (!isAuthenticated) return null;

  return (
    <AppLayout userEmail={userEmail}>
      <main className="flex-1 bg-card rounded-2xl border border-border/50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Omniscient Visual Architect</h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              7-layer prompt architecture with face-blind technique
            </p>
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
            <div className="grid grid-cols-2 gap-3">
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
                  Reference Image
                </TabsTrigger>
                <TabsTrigger value="text" className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4" />
                  Creative Brief
                </TabsTrigger>
              </TabsList>

              <TabsContent value="image" className="mt-4 space-y-4">
                {imagePreview ? (
                  <div className="relative group">
                    <img
                      src={imagePreview}
                      alt="Reference"
                      className="w-full max-h-64 object-contain rounded-xl border border-border/50"
                    />
                    <button
                      onClick={clearImage}
                      disabled={isGenerating}
                      className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm border border-border p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border/50 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Upload reference image</span>
                    <span className="text-xs text-muted-foreground/70 mt-1">AI will extract the complete visual DNA</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={isGenerating}
                    />
                  </label>
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
            disabled={isGenerating || (inputMode === "image" ? !imageBase64 : !textPrompt.trim())}
            className="w-full h-12 text-base font-medium"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating Visual Universe...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Generate Style Pack ({sceneCount} scenes)
              </>
            )}
          </Button>

          {/* Generated Packs */}
          {generatedPacks.length > 0 && (
            <Card className="p-4 border-border/50 space-y-3">
              <Label className="text-sm font-medium">Generated Packs</Label>
              <div className="space-y-2">
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
