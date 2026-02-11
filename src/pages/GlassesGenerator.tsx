import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Send, Loader2, Upload, X, Check } from "lucide-react";
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
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file");
      return;
    }
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
    if (!photoBase64) {
      toast.error("Please upload a photo");
      return;
    }
    if (!selectedGlasses) {
      toast.error("Please select glasses");
      return;
    }

    const glassesAsset = GLASSES_ASSETS.find((g) => g.id === selectedGlasses);
    if (!glassesAsset) return;

    setIsGenerating(true);
    try {
      // Fetch glasses asset and convert to base64
      const glassesResp = await fetch(glassesAsset.url);
      const glassesBlob = await glassesResp.blob();
      const glassesReader = new FileReader();
      const glassesBase64Data = await new Promise<string>((resolve) => {
        glassesReader.onload = () => resolve((glassesReader.result as string).split(",")[1]);
        glassesReader.readAsDataURL(glassesBlob);
      });

      const { data, error } = await supabase.functions.invoke("generate-glasses-image", {
        body: {
          photoBase64,
          photoMimeType,
          glassesBase64: glassesBase64Data,
          glassesMimeType: glassesBlob.type || "image/png",
          model: selectedModel,
        },
      });

      if (error) throw new Error(error.message || "Failed to generate");
      if (data?.error) throw new Error(data.error);
      if (!data?.imageUrl) throw new Error("No image returned");

      setGeneratedImages((prev) => [
        {
          id: crypto.randomUUID(),
          text: glassesAsset.name,
          imageUrl: data.imageUrl,
          createdAt: new Date(),
        },
        ...prev,
      ]);
      toast.success("Image generated!");
    } catch (error) {
      console.error("Generation error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate");
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <AppLayout userEmail={user.email}>
      <main className="flex-1 overflow-hidden flex min-w-0 bg-background">
        {/* Left Panel */}
        <div className="w-80 flex-shrink-0 border-r border-border p-4 flex flex-col gap-4 overflow-y-auto">
          <div>
            <h2 className="text-lg font-semibold mb-1">Glasses Try-On</h2>
            <p className="text-sm text-muted-foreground">
              Select glasses, upload a photo, and generate
            </p>
          </div>

          {/* Glasses Asset Selector */}
          <div>
            <label className="text-sm font-medium mb-2 block">Select Glasses</label>
            {GLASSES_ASSETS.length === 0 ? (
              <div className="text-xs text-muted-foreground border border-dashed border-border rounded-lg p-4 text-center">
                No glasses assets yet. Assets will be added soon.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {GLASSES_ASSETS.map((glasses) => (
                  <button
                    key={glasses.id}
                    onClick={() => setSelectedGlasses(glasses.id)}
                    className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all ${
                      selectedGlasses === glasses.id
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border hover:border-foreground/40"
                    }`}
                  >
                    <img
                      src={glasses.url}
                      alt={glasses.name}
                      className="w-full h-full object-contain p-1 bg-muted/20"
                    />
                    {selectedGlasses === glasses.id && (
                      <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                    <span className="absolute bottom-0 left-0 right-0 text-[9px] text-center bg-background/80 py-0.5 truncate">
                      {glasses.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Photo Upload */}
          <div>
            <label className="text-sm font-medium mb-2 block">Your Photo</label>
            {photoPreview ? (
              <div className="relative group">
                <img
                  src={photoPreview}
                  alt="Your photo"
                  className="w-full h-40 object-cover rounded-lg border border-border"
                />
                <Button
                  onClick={() => {
                    setPhotoPreview(null);
                    setPhotoBase64(null);
                  }}
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-background"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border border-dashed border-border rounded-lg cursor-pointer bg-muted/10 hover:bg-muted/30 hover:border-foreground/40 transition-colors">
                <Upload className="w-5 h-5 mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Upload face photo</p>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                />
              </label>
            )}
          </div>

          {/* Model Selector */}
          <div>
            <label className="text-sm font-medium mb-2 block">Model</label>
            <div className="flex gap-2">
              {[
                { id: "flash", label: "Flash" },
                { id: "pro", label: "Pro" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all border ${
                    selectedModel === m.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-foreground/40"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !photoBase64 || !selectedGlasses}
            className="w-full gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Generate
              </>
            )}
          </Button>
        </div>

        {/* Right Panel - Gallery */}
        <div className="flex-1 overflow-hidden">
          <QuoteGallery quotes={generatedImages} />
        </div>
      </main>
    </AppLayout>
  );
};

export default GlassesGenerator;
