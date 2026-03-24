import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Wand2, Loader2, X, Check, Home, Camera, Box, Aperture, AlertCircle, ClipboardPaste } from "lucide-react";
import type { PackFile } from "@/types/pack";
import { getPackId, getPackName, getSceneCount, hasScenes } from "@/types/pack";
import { AppLayout } from "@/components/AppLayout";
import { User } from "@supabase/supabase-js";
import { ModelSelector } from "@/components/ModelSelector";
import { useGenerationSettings } from "@/hooks/useGenerationSettings";

// JSON Uploader Component
const JsonUploader = ({ onPacksLoad, disabled }: { onPacksLoad: (packs: PackFile[]) => Promise<{ uploadedCount: number; failed: string[] }>; disabled?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePaste = async () => {
    if (!jsonText.trim()) {
      setError("Please paste JSON content");
      return;
    }

    const extractJsonSlice = (raw: string) => {
      let s = raw.trim();
      if (s.startsWith("```json")) s = s.slice(7);
      else if (s.startsWith("```")) s = s.slice(3);
      if (s.endsWith("```")) s = s.slice(0, -3);
      s = s.trim();

      const firstCurly = s.indexOf("{");
      const firstSquare = s.indexOf("[");
      const start = firstCurly === -1 ? firstSquare : firstSquare === -1 ? firstCurly : Math.min(firstCurly, firstSquare);
      if (start === -1) return s;

      const lastCurly = s.lastIndexOf("}");
      const lastSquare = s.lastIndexOf("]");
      const end = Math.max(lastCurly, lastSquare);
      if (end === -1 || end <= start) return s.slice(start);
      return s.slice(start, end + 1);
    };

    const normalizeToPacks = (parsed: any): PackFile[] => {
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        if (parsed.pack && typeof parsed.pack === "object") return [parsed.pack as PackFile];
        if (Array.isArray(parsed.packs)) return parsed.packs as PackFile[];
        if (Array.isArray(parsed.data)) return parsed.data as PackFile[];
        if (parsed.data && typeof parsed.data === "object") {
          if (parsed.data.pack) return [parsed.data.pack as PackFile];
          if (Array.isArray(parsed.data.packs)) return parsed.data.packs as PackFile[];
        }
      }
      if (Array.isArray(parsed)) return parsed as PackFile[];
      return [parsed as PackFile];
    };

    setIsUploading(true);
    setError(null);

    try {
      const slice = extractJsonSlice(jsonText);
      const parsed = JSON.parse(slice);
      const packs = normalizeToPacks(parsed);

      for (const pack of packs) {
        const packId = getPackId(pack);
        const packName = getPackName(pack);
        if (!packId || !packName) {
          setError("Invalid JSON: missing pack_id or package_name");
          setIsUploading(false);
          return;
        }
        if (!hasScenes(pack)) {
          setError("Invalid JSON: missing or empty scenes array");
          setIsUploading(false);
          return;
        }
      }

      const result = await onPacksLoad(packs);
      if (result.uploadedCount > 0) {
        setJsonText("");
        setIsOpen(false);
        toast.success(`${result.uploadedCount} pack(s) uploaded`);
      }
      if (result.failed.length > 0) {
        setError(`${result.failed.length} pack(s) failed`);
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("Invalid JSON syntax");
      } else {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs h-7 rounded-lg" disabled={disabled}>
          <ClipboardPaste className="h-3 w-3 mr-1.5" />
          Paste JSON
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-sm font-semibold">Paste JSON Pack</AlertDialogTitle>
          <AlertDialogDescription className="text-xs">
            Paste your JSON pack content below.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-3">
          <textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setError(null);
            }}
            placeholder='{"package_meta": {...}, "global_render_settings": {...}, "shots": [...]}'
            className="w-full h-48 p-3 text-xs font-mono bg-accent border-0 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none resize-none"
            disabled={isUploading}
          />
          {error && (
            <div className="flex items-center gap-2 text-destructive text-xs">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isUploading} className="rounded-lg text-xs h-8">Cancel</AlertDialogCancel>
          <Button
            onClick={handlePaste}
            disabled={isUploading || !jsonText.trim()}
            className="rounded-lg text-xs h-8"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  base64: string;
  status: 'pending' | 'generating' | 'success' | 'saved' | 'error';
  pack?: PackFile;
  error?: string;
  savedToDb?: boolean;
}

const SCENE_COUNT_OPTIONS = [4, 8, 12, 16];

type PackType = "photography" | "3d" | "photo" | "eye";
type Gender = "male" | "female" | "unisex";

const PACK_TYPE_OPTIONS: { value: PackType; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    value: "photography", 
    label: "Photography", 
    icon: <Camera className="h-4 w-4" />,
    description: "Realistic photography styles"
  },
  { 
    value: "eye", 
    label: "Eye Director", 
    icon: <Aperture className="h-4 w-4" />,
    description: "Complete photoshoot session"
  },
  { 
    value: "photo", 
    label: "Photo (Dense)", 
    icon: <Camera className="h-4 w-4" />,
    description: "Dense Anchor Protocol"
  },
  { 
    value: "3d", 
    label: "3D Character", 
    icon: <Box className="h-4 w-4" />,
    description: "3D render styles"
  },
];

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "unisex", label: "Unisex" },
];

export default function Generator() {
  const navigate = useNavigate();
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sceneCount, setSceneCount] = useState<number>(8);
  const [packType, setPackType] = useState<PackType>("photography");
  const [category, setCategory] = useState<string>("Portrait");
  const [gender, setGender] = useState<Gender>("unisex");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  
  const {
    selectedModel,
    setSelectedModel,
    aspectRatio,
    setAspectRatio,
    resolution,
    setResolution,
  } = useGenerationSettings();

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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter(i => i.id !== id);
    });
  };

  const clearAll = () => {
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setImages([]);
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

  const handleGenerateAll = async () => {
    const pendingImages = images.filter(img => img.status === 'pending' || img.status === 'error');
    if (pendingImages.length === 0) {
      toast.error("No images to generate");
      return;
    }

    setIsGenerating(true);
    setCompletedCount(0);

    setImages(prev => prev.map(p => 
      pendingImages.find(pi => pi.id === p.id) 
        ? { ...p, status: 'generating' as const } 
        : p
    ));

    const results = await Promise.allSettled(
      pendingImages.map(async (img) => {
        try {
          const { data, error } = await supabase.functions.invoke("generate-pack", {
            body: { imageBase64: img.base64, sceneCount, packType, gender, category },
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

    setImages(prev => prev.map(p => {
      const result = results.find(r => {
        if (r.status === "fulfilled") return r.value.id === p.id;
        if (r.status === "rejected") return r.reason?.id === p.id;
        return false;
      });

      if (!result) return p;

      if (result.status === "fulfilled") {
        return {
          ...p,
          status: result.value.saved ? 'saved' as const : 'success' as const,
          pack: result.value.pack,
          savedToDb: result.value.saved,
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

  const goToMainPage = () => {
    navigate("/");
  };

  const handleJsonPacksLoad = async (packs: PackFile[]): Promise<{ uploadedCount: number; failed: string[] }> => {
    const failed: string[] = [];
    let uploadedCount = 0;

    for (const pack of packs) {
      const saved = await savePackToDatabase(pack);
      if (saved) {
        uploadedCount++;
      } else {
        failed.push(getPackName(pack) || "Unknown");
      }
    }

    return { uploadedCount, failed };
  };

  const pendingCount = images.filter(i => i.status === 'pending').length;
  const savedCount = images.filter(i => i.status === 'saved').length;
  const errorCount = images.filter(i => i.status === 'error').length;
  const generatingCount = images.filter(i => i.status === 'generating').length;
  const progress = images.length > 0 ? (completedCount / generatingCount) * 100 : 0;

  if (!isAuthenticated) return null;

  return (
    <AppLayout userEmail={userEmail}>
      <main className="flex-1 bg-card rounded-2xl border border-border/50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold">Bulk Pack Generator</h1>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
              <span>{images.length} images</span>
              {savedCount > 0 && <span className="text-success">• {savedCount} saved</span>}
              {errorCount > 0 && <span className="text-destructive">• {errorCount} failed</span>}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Generation Settings */}
          <div className="bg-accent/50 rounded-xl p-4 space-y-4">
            {/* Pack Type Selector */}
            <div className="space-y-2">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Pack Type</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {PACK_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setPackType(option.value)}
                    disabled={isGenerating}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left ${
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

            {/* Inline Settings */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase">Scenes</Label>
                <Select
                  value={sceneCount.toString()}
                  onValueChange={(v) => setSceneCount(parseInt(v))}
                  disabled={isGenerating}
                >
                  <SelectTrigger className="w-20 h-7 text-xs rounded-lg border-0 bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCENE_COUNT_OPTIONS.map((count) => (
                      <SelectItem key={count} value={count.toString()}>
                        {count}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase">Category</Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Portrait..."
                  disabled={isGenerating}
                  className="w-28 h-7 text-xs rounded-lg border-0 bg-card"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase">Gender</Label>
                <Select
                  value={gender}
                  onValueChange={(v) => setGender(v as Gender)}
                  disabled={isGenerating}
                >
                  <SelectTrigger className="w-20 h-7 text-xs rounded-lg border-0 bg-card">
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
            
            {/* Model Selector */}
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              aspectRatio={aspectRatio}
              onAspectRatioChange={setAspectRatio}
              resolution={resolution}
              onResolutionChange={setResolution}
            />
          </div>

          {/* Upload Area */}
          <div className="bg-accent/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Reference Images</Label>
              <div className="flex items-center gap-1.5">
                <JsonUploader 
                  onPacksLoad={handleJsonPacksLoad}
                  disabled={isGenerating}
                />
                {images.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs h-7 rounded-lg" disabled={isGenerating}>
                    Clear
                  </Button>
                )}
              </div>
            </div>

            <label className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-border rounded-xl cursor-pointer hover:bg-card transition-colors">
              <Upload className="h-5 w-5 text-muted-foreground mb-1.5" />
              <span className="text-xs text-muted-foreground">Drag images or click to upload</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImagesUpload}
                className="hidden"
              />
            </label>

            {/* Image Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
                {images.map(img => (
                  <div key={img.id} className="relative group">
                    <img
                      src={img.preview}
                      alt="Reference"
                      className={`w-full aspect-square object-cover rounded-lg ring-2 ${
                        img.status === 'saved' ? 'ring-success' :
                        img.status === 'success' ? 'ring-primary' :
                        img.status === 'error' ? 'ring-destructive' :
                        img.status === 'generating' ? 'ring-warning animate-pulse' :
                        'ring-border/50'
                      }`}
                    />
                    {img.status === 'generating' && (
                      <div className="absolute inset-0 bg-foreground/30 rounded-lg flex items-center justify-center">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-foreground" />
                      </div>
                    )}
                    {img.status === 'saved' && (
                      <div className="absolute inset-0 bg-success/20 rounded-lg flex items-center justify-center">
                        <Check className="h-3.5 w-3.5 text-success" />
                      </div>
                    )}
                    <button
                      onClick={() => removeImage(img.id)}
                      className="absolute -top-1 -right-1 bg-card border border-border w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Progress */}
            {isGenerating && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Generating... {completedCount} / {generatingCount}</span>
                  <span className="font-medium">{generatingCount > 0 ? Math.round(progress) : 0}%</span>
                </div>
                <Progress value={generatingCount > 0 ? progress : 0} className="h-1" />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleGenerateAll}
                disabled={pendingCount === 0 || isGenerating}
                className="flex-1 h-9 rounded-xl text-xs font-medium"
                size="sm"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                    Generate & Save ({pendingCount})
                  </>
                )}
              </Button>
              {savedCount > 0 && (
                <Button
                  onClick={goToMainPage}
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-xl text-xs"
                >
                  <Home className="h-3.5 w-3.5 mr-1.5" />
                  Home
                </Button>
              )}
            </div>
          </div>

          {/* Saved Packs List */}
          {images.filter(i => i.status === 'saved' && i.pack).length > 0 && (
            <div className="bg-success/5 border border-success/20 rounded-xl p-4 space-y-3">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-success">Saved Packs</Label>
              <div className="space-y-1.5">
                {images.filter(i => i.status === 'saved' && i.pack).map(img => (
                  <div key={img.id} className="flex items-center gap-3 p-2.5 bg-success/5 rounded-lg">
                    <img src={img.preview} className="w-9 h-9 object-cover rounded-lg shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {img.pack ? getPackName(img.pack) : 'Untitled Pack'}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {getSceneCount(img.pack!) || 0} scenes • Saved ✓
                      </p>
                    </div>
                    <Check className="h-3.5 w-3.5 text-success shrink-0" />
                  </div>
                ))}
              </div>
              <Button onClick={goToMainPage} className="w-full h-8 rounded-xl text-xs" size="sm">
                <Home className="h-3.5 w-3.5 mr-1.5" />
                View Packs
              </Button>
            </div>
          )}

          {/* Error List */}
          {images.filter(i => i.status === 'error').length > 0 && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 space-y-2">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-destructive">Failed</Label>
              {images.filter(i => i.status === 'error').map(img => (
                <div key={img.id} className="flex items-center gap-2 text-xs text-destructive/80">
                  <img src={img.preview} className="w-6 h-6 object-cover rounded shrink-0" />
                  <span className="truncate">{img.error}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </AppLayout>
  );
}
