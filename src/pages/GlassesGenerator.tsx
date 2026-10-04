import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2, Upload, X, Check, CheckCircle2, Glasses } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { QuoteGallery } from "@/components/QuoteGallery";
import { SampleChip, SampleNotice } from "@/components/SampleNotice";
import { mockImage, type MockImageKey } from "@/data/mock";
import { toast } from "sonner";

const GLASSES_ASSETS = [
  { id: "top-left", name: "Top Left", url: "/glasses/top-left.png" },
  { id: "top", name: "Top", url: "/glasses/top.png" },
  { id: "top-right", name: "Top Right", url: "/glasses/top-right.png" },
  { id: "left", name: "Left", url: "/glasses/left.png" },
  { id: "center", name: "Center", url: "/glasses/center.png" },
  { id: "right", name: "Right", url: "/glasses/right.png" },
  { id: "bottom-left", name: "Bottom Left", url: "/glasses/bottom-left.png" },
  { id: "bottom", name: "Bottom", url: "/glasses/bottom.png" },
  { id: "bottom-right", name: "Bottom Right", url: "/glasses/bottom-right.png" },
  { id: "dead", name: "Dead", url: "/glasses/dead.png" },
  { id: "hearts", name: "Hearts", url: "/glasses/hearts.png" },
  { id: "silly", name: "Silly", url: "/glasses/silly.png" },
  { id: "savvy", name: "Savvy", url: "/glasses/savvy.png" },
  { id: "shy", name: "Shy", url: "/glasses/shy.png" },
];

/**
 * Sample before/after previews. The frame is placed over the eye line of the
 * mock portraits: wide shots and close-ups share their own face geometry
 * (percentages of the square image).
 */
const FACE_FRAMES = {
  wide: { left: "33.5%", top: "26.5%", width: "31%" },
  close: { left: "21.5%", top: "28%", width: "54%" },
} as const;

const SAMPLE_TRY_ONS: { id: string; photo: MockImageKey; frame: keyof typeof FACE_FRAMES; glasses: string }[] = [
  { id: "t1", photo: "portrait-blush", frame: "wide", glasses: "center" },
  { id: "t2", photo: "portrait-close-cobalt", frame: "close", glasses: "hearts" },
  { id: "t3", photo: "portrait-mint", frame: "wide", glasses: "top-right" },
  { id: "t4", photo: "portrait-close-tangerine", frame: "close", glasses: "savvy" },
];

const TryOnTile = ({ photo, label, glassesUrl, frame }: { photo: MockImageKey; label: string; glassesUrl?: string; frame: keyof typeof FACE_FRAMES }) => (
  <div className="relative aspect-square overflow-hidden rounded-md bg-control">
    <img src={mockImage(photo)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
    {glassesUrl && (
      <img
        src={glassesUrl}
        alt=""
        loading="lazy"
        className="absolute h-auto max-w-none drop-shadow-md"
        style={FACE_FRAMES[frame]}
      />
    )}
    <span className="absolute left-2 top-2 inline-flex h-6 items-center rounded-xs bg-foreground/25 px-2 text-caption text-white backdrop-blur-sm">
      {label}
    </span>
  </div>
);

const SampleTryOns = ({ onTry, selectedId }: { onTry: (glassesId: string) => void; selectedId: string | null }) => (
  <div className="space-y-3">
    <SampleNotice>Your try-on results will appear here.</SampleNotice>
    <section className="bg-app rounded-lg p-3 sm:p-4 space-y-3" aria-labelledby="sample-tryons-heading">
      <header className="flex items-center gap-2 min-w-0">
        <h2 id="sample-tryons-heading" className="text-label-md text-foreground truncate">
          Before & after
        </h2>
        <SampleChip className="shrink-0" />
        <span className="ml-auto flex items-center gap-1.5 shrink-0">
          <span className="meta-chip">Pro</span>
          <span className="meta-chip">1:1</span>
        </span>
      </header>
      <ul className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3 list-none m-0 p-0">
        {SAMPLE_TRY_ONS.map((t) => {
          const glasses = GLASSES_ASSETS.find((g) => g.id === t.glasses);
          if (!glasses) return null;
          return (
            <li key={t.id} className="min-w-0 rounded-[12px] bg-card p-2">
              <div className="grid grid-cols-2 gap-1.5">
                <TryOnTile photo={t.photo} frame={t.frame} label="Before" />
                <TryOnTile photo={t.photo} frame={t.frame} label="After" glassesUrl={glasses.url} />
              </div>
              <div className="flex items-center gap-2 px-1 pt-2">
                <span className="flex h-8 w-12 shrink-0 items-center justify-center rounded-md bg-control" aria-hidden="true">
                  <img src={glasses.url} alt="" className="w-9 h-auto" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-label-md text-foreground">{glasses.name}</p>
                  <p className="truncate text-caption text-tertiary-foreground">Front-facing portrait</p>
                </div>
                <Button
                  variant={selectedId === glasses.id ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => onTry(glasses.id)}
                  aria-pressed={selectedId === glasses.id}
                  aria-label={`Select ${glasses.name} glasses`}
                >
                  {selectedId === glasses.id ? (
                    <Check strokeWidth={1.5} aria-hidden="true" />
                  ) : (
                    <Glasses strokeWidth={1.5} aria-hidden="true" />
                  )}
                  {selectedId === glasses.id ? "Selected" : "Try these"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  </div>
);

interface GeneratedImage {
  id: string;
  text: string;
  imageUrl: string;
  createdAt: Date;
}

const GlassesGenerator = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGlasses, setSelectedGlasses] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoMimeType, setPhotoMimeType] = useState<string>("image/jpeg");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("pro");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session) navigate("/auth");
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/auth");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) { toast.error("Please upload a valid image"); return; }
    setPhotoMimeType(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPhotoPreview(result);
      setPhotoBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleGenerate = async () => {
    if (!photoBase64) { toast.error("Please upload a photo"); return; }
    if (!selectedGlasses) { toast.error("Please select glasses"); return; }
    const glassesAsset = GLASSES_ASSETS.find((g) => g.id === selectedGlasses);
    if (!glassesAsset) return;

    setIsGenerating(true);
    try {
      const glassesResp = await fetch(glassesAsset.url);
      const glassesBlob = await glassesResp.blob();
      const glassesBase64Data = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve((r.result as string).split(",")[1]);
        r.readAsDataURL(glassesBlob);
      });

      const { data, error } = await supabase.functions.invoke("generate-glasses-image", {
        body: { photoBase64, photoMimeType, glassesBase64: glassesBase64Data, glassesMimeType: glassesBlob.type || "image/png", model: selectedModel },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.imageUrl) throw new Error("No image returned");

      setGeneratedImages((prev) => [{ id: crypto.randomUUID(), text: glassesAsset.name, imageUrl: data.imageUrl, createdAt: new Date() }, ...prev]);
      toast.success("Image generated!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed");
    } finally { setIsGenerating(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" aria-busy="true">
        <Loader2 className="size-5 animate-spin text-muted-foreground" strokeWidth={1.5} aria-label="Loading" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <AppLayout userEmail={user.email}>
      <main className="flex-1 overflow-y-auto md:overflow-hidden flex flex-col md:flex-row gap-2 min-w-0 bg-background p-2">
        {/* Left panel — tool controls */}
        <section
          aria-labelledby="glasses-heading"
          className="w-full md:w-tool-panel shrink-0 bg-card rounded-lg p-3 flex flex-col gap-4 md:overflow-y-auto"
        >
          {/* Tool title card */}
          <div className="rounded-[12px] px-3 py-2 bg-cat-video/10 flex items-center gap-2">
            <Glasses className="size-4 text-cat-video shrink-0" strokeWidth={1.5} aria-hidden="true" />
            <div className="min-w-0">
              <h1 id="glasses-heading" className="text-heading-sm text-foreground truncate">Glasses try-on</h1>
              <p className="text-caption text-muted-foreground truncate">Select glasses, upload a photo, generate</p>
            </div>
          </div>

          {/* Model */}
          <div className="space-y-1.5">
            <Label id="glasses-model-label">Model</Label>
            <div
              role="radiogroup"
              aria-labelledby="glasses-model-label"
              className="segmented w-full"
            >
              {[
                { id: "flash", label: "Flash" },
                { id: "flash-3.1", label: "3.1" },
                { id: "pro", label: "Pro" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={selectedModel === m.id}
                  onClick={() => setSelectedModel(m.id)}
                  className="segmented-item flex-1 px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Glasses grid */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label id="glasses-grid-label">Glasses</Label>
              {selectedGlasses ? (
                <Badge variant="default">
                  <Check strokeWidth={1.5} aria-hidden="true" />
                  Selected
                </Badge>
              ) : (
                <Badge variant="default">
                  <Glasses strokeWidth={1.5} aria-hidden="true" />
                  Required
                </Badge>
              )}
            </div>
            <div role="radiogroup" aria-labelledby="glasses-grid-label" className="grid grid-cols-3 gap-2">
              {GLASSES_ASSETS.map((glasses) => (
                <button
                  key={glasses.id}
                  type="button"
                  role="radio"
                  aria-checked={selectedGlasses === glasses.id}
                  aria-label={glasses.name}
                  onClick={() => setSelectedGlasses(glasses.id)}
                  className={`relative aspect-square rounded-md overflow-hidden transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                    selectedGlasses === glasses.id
                      ? "bg-active ring-1 ring-foreground/80"
                      : "bg-control hover:bg-control-hover"
                  }`}
                >
                  <img src={glasses.url} alt="" className="w-full h-full object-contain p-2 pb-4" />
                  {selectedGlasses === glasses.id && (
                    <div className="absolute top-1 right-1 size-4 rounded-full bg-foreground text-primary-foreground flex items-center justify-center" aria-hidden="true">
                      <Check className="size-3" strokeWidth={2} />
                    </div>
                  )}
                  <span className="absolute bottom-1 inset-x-0 text-micro text-muted-foreground text-center px-1 truncate" aria-hidden="true">
                    {glasses.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Photo upload */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="glasses-photo">Your photo</Label>
              {photoPreview ? (
                <Badge variant="default">
                  <CheckCircle2 strokeWidth={1.5} aria-hidden="true" />
                  Uploaded
                </Badge>
              ) : (
                <Badge variant="default">
                  <Upload strokeWidth={1.5} aria-hidden="true" />
                  Required
                </Badge>
              )}
            </div>
            {photoPreview ? (
              <div className="relative group rounded-md overflow-hidden bg-control">
                <img src={photoPreview} alt="Your uploaded photo" className="w-full h-40 object-cover" />
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() => { setPhotoPreview(null); setPhotoBase64(null); }}
                  className="absolute top-2 right-2 h-control-sm w-control-sm rounded-md bg-card/90 text-foreground hover:bg-card flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-4" strokeWidth={1.5} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="glasses-photo"
                className="dropzone flex flex-col items-center justify-center gap-1 w-full p-6 text-center cursor-pointer hover:bg-control-hover focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-card"
              >
                <Upload className="size-5 text-muted-foreground mb-1" strokeWidth={1.5} aria-hidden="true" />
                <p className="text-label-md text-foreground">Upload face photo</p>
                <p className="text-caption text-muted-foreground">PNG or JPG, one front-facing photo</p>
                <input id="glasses-photo" type="file" className="sr-only" accept="image/*" onChange={handlePhotoUpload} />
              </label>
            )}
          </div>

          {/* Generate — full-width black, sticky on mobile */}
          <div className="mt-auto sticky bottom-0 md:static bg-card pt-1 -mx-3 px-3 pb-1 md:mx-0 md:px-0 md:pb-0">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleGenerate}
              disabled={isGenerating || !photoBase64 || !selectedGlasses}
              aria-busy={isGenerating || undefined}
            >
              {isGenerating ? (
                <><Loader2 className="animate-spin" strokeWidth={1.5} aria-hidden="true" />Generating...</>
              ) : (
                <>Generate<Sparkles strokeWidth={1.5} aria-hidden="true" /></>
              )}
            </Button>
          </div>
        </section>

        {/* Right — results feed */}
        <div className="flex-1 min-h-[50vh] md:min-h-0 min-w-0 overflow-hidden">
          <QuoteGallery
            quotes={generatedImages}
            emptyState={<SampleTryOns selectedId={selectedGlasses} onTry={(id) => setSelectedGlasses(id)} />}
          />
        </div>
      </main>
    </AppLayout>
  );
};

export default GlassesGenerator;
