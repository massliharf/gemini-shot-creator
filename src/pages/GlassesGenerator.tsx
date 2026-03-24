import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Send, Loader2, Upload, X, Check } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { QuoteGallery } from "@/components/QuoteGallery";
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <AppLayout userEmail={user.email}>
      <main className="flex-1 overflow-hidden flex min-w-0 bg-background">
        {/* Left Panel */}
        <div className="w-72 flex-shrink-0 border-r border-border/50 p-4 flex flex-col gap-4 overflow-y-auto">
          <div>
            <h2 className="text-sm font-semibold mb-0.5">Glasses Try-On</h2>
            <p className="text-xs text-muted-foreground">Select glasses, upload a photo, generate</p>
          </div>

          {/* Glasses Grid */}
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Select Glasses</label>
            <div className="grid grid-cols-3 gap-1.5">
              {GLASSES_ASSETS.map((glasses) => (
                <button
                  key={glasses.id}
                  onClick={() => setSelectedGlasses(glasses.id)}
                  className={`relative aspect-square rounded-lg overflow-hidden transition-all ${
                    selectedGlasses === glasses.id
                      ? "ring-2 ring-foreground ring-offset-1"
                      : "border border-border/50 hover:border-border"
                  }`}
                >
                  <img src={glasses.url} alt={glasses.name} className="w-full h-full object-contain p-1 bg-accent/30" />
                  {selectedGlasses === glasses.id && (
                    <div className="absolute top-0.5 right-0.5 bg-foreground rounded-full p-0.5">
                      <Check className="w-2.5 h-2.5 text-background" />
                    </div>
                  )}
                  <span className="absolute bottom-0 inset-x-0 text-[8px] text-center bg-background/70 py-px truncate">
                    {glasses.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Your Photo</label>
            {photoPreview ? (
              <div className="relative group">
                <img src={photoPreview} alt="Photo" className="w-full h-36 object-cover rounded-lg" />
                <button
                  onClick={() => { setPhotoPreview(null); setPhotoBase64(null); }}
                  className="absolute top-1.5 right-1.5 h-5 w-5 rounded-md bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-28 border border-dashed border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
                <Upload className="w-4 h-4 mb-1 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground">Upload face photo</p>
                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              </label>
            )}
          </div>

          {/* Model */}
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Model</label>
            <div className="flex gap-1.5">
              {[
                { id: "flash", label: "Flash" },
                { id: "flash-3.1", label: "3.1" },
                { id: "pro", label: "Pro" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                    selectedModel === m.id
                      ? "bg-foreground text-background"
                      : "bg-accent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Generate */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !photoBase64 || !selectedGlasses}
            className="w-full h-9 rounded-lg bg-foreground text-background hover:bg-foreground/90 text-xs font-semibold gap-2"
          >
            {isGenerating ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generating...</>
            ) : (
              <><Send className="w-3.5 h-3.5" />Generate</>
            )}
          </Button>
        </div>

        {/* Right Panel */}
        <div className="flex-1 overflow-hidden">
          <QuoteGallery quotes={generatedImages} />
        </div>
      </main>
    </AppLayout>
  );
};

export default GlassesGenerator;
