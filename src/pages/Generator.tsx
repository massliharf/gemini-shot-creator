import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2, X, Check, Home, Camera, Box, Aperture, ClipboardPaste, XCircle, CheckCircle2, ImageIcon, Layers, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PackFile } from "@/types/pack";
import { getPackId, getPackName, getSceneCount, hasScenes } from "@/types/pack";
import { AppLayout } from "@/components/AppLayout";
import { User } from "@supabase/supabase-js";
import { ModelSelector } from "@/components/ModelSelector";
import { useGenerationSettings } from "@/hooks/useGenerationSettings";
import { SamplePackFeed, ToolHeader } from "@/components/results";

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
        <Button variant="outline" size="sm" disabled={disabled}>
          <ClipboardPaste strokeWidth={1.5} aria-hidden="true" />
          Paste JSON
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-heading-md">Paste JSON pack</AlertDialogTitle>
          <AlertDialogDescription className="text-body-sm text-muted-foreground">
            Paste your JSON pack content below.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="json-pack-input">JSON content</Label>
          <Textarea
            id="json-pack-input"
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setError(null);
            }}
            placeholder='{"package_meta": {...}, "global_render_settings": {...}, "shots": [...]}'
            className="h-48 text-code resize-none"
            disabled={isUploading}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "json-pack-error" : undefined}
          />
          {error && (
            <div id="json-pack-error" role="alert" className="flex items-center gap-2 text-destructive text-caption">
              <XCircle className="size-4" strokeWidth={1.5} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isUploading}>Cancel</AlertDialogCancel>
          <Button
            onClick={handlePaste}
            disabled={isUploading || !jsonText.trim()}
          >
            {isUploading ? (
              <>
                <Loader2 className="animate-spin" strokeWidth={1.5} aria-hidden="true" />
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
    icon: <Camera className="size-4" strokeWidth={1.5} aria-hidden="true" />,
    description: "Realistic photography styles"
  },
  { 
    value: "eye", 
    label: "Eye Director", 
    icon: <Aperture className="size-4" strokeWidth={1.5} aria-hidden="true" />,
    description: "Complete photoshoot session"
  },
  { 
    value: "photo", 
    label: "Photo (Dense)", 
    icon: <Camera className="size-4" strokeWidth={1.5} aria-hidden="true" />,
    description: "Dense Anchor Protocol"
  },
  { 
    value: "3d", 
    label: "3D Character", 
    icon: <Box className="size-4" strokeWidth={1.5} aria-hidden="true" />,
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
      <main className="flex-1 min-h-0 min-w-0 bg-background flex flex-col lg:flex-row gap-2 p-2 overflow-y-auto lg:overflow-hidden">
        {/* Tool panel */}
        <aside
          aria-label="Bulk Pack Generator settings"
          className="w-full lg:w-tool-panel shrink-0 bg-card rounded-lg p-3 flex flex-col gap-4 lg:h-full lg:min-h-0 lg:overflow-y-auto"
        >
          {/* Tool title card */}
          <ToolHeader icon={Layers} category="image" title="Bulk Pack Generator" description="One pack per reference, in parallel" />

          {/* Pack type selector */}
          <div className="space-y-1.5">
            <Label id="pack-type-label">Pack type</Label>
            <div role="radiogroup" aria-labelledby="pack-type-label" className="flex flex-col gap-1">
              {PACK_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={packType === option.value}
                  onClick={() => setPackType(option.value)}
                  disabled={isGenerating}
                  className={cn(
                    "flex items-center gap-2 min-h-control-md px-2 py-1.5 rounded-md text-left transition-colors duration-fast ease-standard",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                    "disabled:text-tertiary-foreground disabled:cursor-not-allowed",
                    packType === option.value
                      ? "bg-active text-foreground ring-1 ring-foreground/80"
                      : "bg-control text-foreground hover:bg-control-hover",
                  )}
                >
                  <div className={cn("shrink-0", packType === option.value ? "text-foreground" : "text-muted-foreground")}>
                    {option.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-label-md text-foreground truncate">{option.label}</p>
                    <p className="text-caption text-muted-foreground truncate">{option.description}</p>
                  </div>
                  {packType === option.value && <Check className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gen-scenes">Scenes</Label>
            <Select
              value={sceneCount.toString()}
              onValueChange={(v) => setSceneCount(parseInt(v))}
              disabled={isGenerating}
            >
              <SelectTrigger id="gen-scenes">
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

          <div className="space-y-1.5">
            <Label htmlFor="gen-category">Category</Label>
            <Input
              id="gen-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Portrait..."
              disabled={isGenerating}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gen-gender">Gender</Label>
            <Select
              value={gender}
              onValueChange={(v) => setGender(v as Gender)}
              disabled={isGenerating}
            >
              <SelectTrigger id="gen-gender">
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

          {/* Model / aspect ratio / resolution */}
          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            aspectRatio={aspectRatio}
            onAspectRatioChange={setAspectRatio}
            resolution={resolution}
            onResolutionChange={setResolution}
          />

          {/* Reference images */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Label id="ref-images-heading">References</Label>
              <div className="flex items-center gap-1">
                <JsonUploader
                  onPacksLoad={handleJsonPacksLoad}
                  disabled={isGenerating}
                />
                {images.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAll} disabled={isGenerating}>
                    <X strokeWidth={1.5} aria-hidden="true" />
                    Clear
                  </Button>
                )}
              </div>
            </div>

            <label className="dropzone p-6 flex flex-col items-center justify-center w-full text-center cursor-pointer focus-within:border-ring">
              <Upload className="size-5 text-muted-foreground mb-2" strokeWidth={1.5} aria-hidden="true" />
              <span className="text-label-md text-foreground">Drag images or click to upload</span>
              <span className="text-caption text-muted-foreground mt-1">PNG, JPG or WebP. Multiple files allowed.</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImagesUpload}
                className="sr-only"
              />
            </label>
          </div>

          {/* Generate */}
          <div className="sticky bottom-0 -mx-3 -mb-3 px-3 pb-3 pt-2 bg-card safe-bottom mt-auto">
            <Button
              onClick={handleGenerateAll}
              disabled={pendingCount === 0 || isGenerating}
              size="lg"
              fullWidth
            >
              {isGenerating ? (
                <>
                  Generating...
                  <Loader2 className="animate-spin" strokeWidth={1.5} aria-hidden="true" />
                </>
              ) : (
                <>
                  Generate & save ({pendingCount})
                  <Sparkles strokeWidth={1.5} aria-hidden="true" />
                </>
              )}
            </Button>
          </div>
        </aside>

        {/* Results feed */}
        <section aria-label="Results" className="flex-1 min-w-0 flex flex-col lg:min-h-0">
          {images.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap min-h-control-md px-1 pb-2">
            <Badge>
              <ImageIcon strokeWidth={1.5} aria-hidden="true" />
              {images.length} images
            </Badge>
            {savedCount > 0 && (
              <Badge variant="success">
                <CheckCircle2 strokeWidth={1.5} aria-hidden="true" />
                {savedCount} saved
              </Badge>
            )}
            {errorCount > 0 && (
              <Badge variant="danger">
                <XCircle strokeWidth={1.5} aria-hidden="true" />
                {errorCount} failed
              </Badge>
            )}
            {savedCount > 0 && (
              <Button
                onClick={goToMainPage}
                variant="outline"
                size="sm"
                className="ml-auto"
              >
                <Home strokeWidth={1.5} aria-hidden="true" />
                Home
              </Button>
            )}
          </div>
          )}

          <div className="flex-1 lg:min-h-0 lg:overflow-y-auto space-y-3 pb-4">
            {images.length === 0 && (
              <SamplePackFeed
                notice="Upload references in the panel — each one becomes a pack here."
                onOpenPack={goToMainPage}
              />
            )}

            {/* Uploaded thumbnails */}
            {images.length > 0 && (
              <div className="bg-app rounded-lg p-4 space-y-3">
                <p className="text-overline text-muted-foreground">Uploaded</p>
                <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3" aria-label="Uploaded reference images">
                  {images.map(img => (
                    <li key={img.id} className="relative group rounded-md overflow-hidden bg-control aspect-square">
                      <img
                        src={img.preview}
                        alt="Reference"
                        className={cn(
                          "size-full object-cover",
                          img.status === 'generating' && 'animate-pulse',
                        )}
                      />
                      {img.status === 'generating' && (
                        <Badge className="absolute bottom-1 left-1" aria-label="Generating">
                          <Loader2 className="animate-spin" strokeWidth={1.5} aria-hidden="true" />
                        </Badge>
                      )}
                      {img.status === 'saved' && (
                        <Badge variant="success" className="absolute bottom-1 left-1" aria-label="Saved">
                          <CheckCircle2 strokeWidth={1.5} aria-hidden="true" />
                        </Badge>
                      )}
                      {img.status === 'error' && (
                        <Badge variant="danger" className="absolute bottom-1 left-1" aria-label="Failed">
                          <XCircle strokeWidth={1.5} aria-hidden="true" />
                        </Badge>
                      )}
                      <button
                        type="button"
                        aria-label="Remove image"
                        onClick={() => removeImage(img.id)}
                        className="absolute top-1 right-1 bg-card/90 text-foreground size-6 rounded-full flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <X className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Progress */}
            {isGenerating && (
              <div className="bg-app rounded-lg p-4 space-y-2" role="status" aria-live="polite">
                <div className="flex items-center justify-between gap-3">
                  <Badge>
                    <Loader2 className="animate-spin" strokeWidth={1.5} aria-hidden="true" />
                    Generating {completedCount} / {generatingCount}
                  </Badge>
                  <span className="text-caption text-muted-foreground tabular-nums">{generatingCount > 0 ? Math.round(progress) : 0}%</span>
                </div>
                <Progress value={generatingCount > 0 ? progress : 0} aria-label="Generation progress" />
              </div>
            )}

            {/* Saved packs */}
            {images.filter(i => i.status === 'saved' && i.pack).length > 0 && (
              <section aria-labelledby="saved-packs-heading" className="bg-app rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 id="saved-packs-heading" className="text-overline text-muted-foreground">Saved packs</h2>
                  <Button onClick={goToMainPage} variant="ghost" size="sm">
                    <Home strokeWidth={1.5} aria-hidden="true" />
                    View packs
                  </Button>
                </div>
                <ul className="flex flex-col gap-1">
                  {images.filter(i => i.status === 'saved' && i.pack).map(img => (
                    <li key={img.id} className="flex items-center gap-3 min-h-control-md px-2 py-1 rounded-md hover:bg-control transition-colors duration-fast ease-standard">
                      <img src={img.preview} alt="" className="size-6 object-cover rounded-xs shrink-0" />
                      <p className="text-label-md text-foreground truncate flex-1 min-w-0">
                        {img.pack ? getPackName(img.pack) : 'Untitled Pack'}
                      </p>
                      <p className="text-caption text-muted-foreground truncate shrink-0">
                        {getSceneCount(img.pack!) || 0} scenes
                      </p>
                      <Badge variant="success">
                        <Check strokeWidth={1.5} aria-hidden="true" />
                        Saved
                      </Badge>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Error list */}
            {images.filter(i => i.status === 'error').length > 0 && (
              <section aria-labelledby="failed-heading" className="bg-app rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <XCircle className="size-4 text-destructive" strokeWidth={1.5} aria-hidden="true" />
                  <h2 id="failed-heading" className="text-overline text-muted-foreground">Failed</h2>
                </div>
                <ul className="flex flex-col gap-1">
                  {images.filter(i => i.status === 'error').map(img => (
                    <li key={img.id} className="flex items-center gap-3 min-h-control-md px-2 text-body-sm text-destructive">
                      <img src={img.preview} alt="" className="size-6 object-cover rounded-xs shrink-0" />
                      <span className="truncate">{img.error}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </section>
      </main>
    </AppLayout>
  );
}
