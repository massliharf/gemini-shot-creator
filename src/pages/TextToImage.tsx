import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Loader2, ImageIcon, Trash2, Download, X, Plus, Upload } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { User } from "@supabase/supabase-js";

const MAX_REF_IMAGES = 5;

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

interface RefImage { file: File; previewUrl: string; }

interface Generation {
  id: string;
  prompt: string;
  model: string;
  aspect_ratio: string;
  resolution: string;
  image_url: string | null;
  created_at: string;
}

const MODEL_OPTIONS = [
  { value: "flash", label: "Flash" },
  { value: "flash-3.1", label: "3.1 Flash" },
  { value: "pro", label: "Pro" },
];

const ASPECT_RATIO_OPTIONS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9"];
const RESOLUTION_OPTIONS = ["1K", "2K", "4K"];

const TextToImage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("flash-3.1");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [resolution, setResolution] = useState("1K");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [refImages, setRefImages] = useState<RefImage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const isProModel = model === "pro" || model === "flash-3.1";

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

  useEffect(() => { if (user) loadHistory(); }, [user]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [generations]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("text_generations")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) throw error;
      setGenerations((data as Generation[]) || []);
    } catch (e) { console.error("Failed to load history:", e); }
    finally { setLoadingHistory(false); }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    const currentPrompt = prompt;
    setPrompt("");
    setIsGenerating(true);

    const tempId = `temp-${Date.now()}`;
    setGenerations(prev => [...prev, {
      id: tempId, prompt: currentPrompt, model, aspect_ratio: aspectRatio,
      resolution, image_url: null, created_at: new Date().toISOString(),
    }]);

    try {
      const referenceImages: { base64: string; mimeType: string }[] = [];
      for (const ref of refImages) {
        const b64 = await fileToBase64(ref.file);
        referenceImages.push({ base64: b64, mimeType: ref.file.type || "image/jpeg" });
      }

      const resp = await supabase.functions.invoke("generate-text-image", {
        body: {
          prompt: currentPrompt, model, aspectRatio,
          resolution: isProModel ? resolution : "1K",
          referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
        },
      });

      if (!resp.data?.success) {
        toast.error(resp.data?.message || "Generation failed");
        setGenerations(prev => prev.filter(g => g.id !== tempId));
        return;
      }
      await loadHistory();
      toast.success("Image generated!");
    } catch (e) {
      console.error("Generation error:", e);
      toast.error("Generation failed");
      setGenerations(prev => prev.filter(g => g.id !== tempId));
    } finally { setIsGenerating(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("text_generations").delete().eq("id", id);
      if (error) throw error;
      setGenerations(prev => prev.filter(g => g.id !== id));
    } catch { toast.error("Delete failed"); }
  };

  const handleDownload = async (imageUrl: string, promptText: string) => {
    try {
      const resp = await fetch(imageUrl);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${promptText.substring(0, 30).replace(/[^a-zA-Z0-9]/g, "_")}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Download failed"); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(); }
  };

  const modelLabel = (m: string) => {
    if (m.includes("3.1-flash")) return "3.1";
    if (m.includes("pro")) return "Pro";
    return "Flash";
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
    <>
      <AppLayout userEmail={user.email}>
        <main className="flex-1 overflow-hidden flex flex-col min-w-0 bg-background">
          {/* Top controls */}
          <div className="px-5 py-2.5 border-b border-border/50 flex items-center gap-2">
            <h1 className="text-sm font-semibold mr-3">Text to Image</h1>

            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-auto h-7 px-2.5 rounded-md border-0 bg-accent text-xs font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={aspectRatio} onValueChange={setAspectRatio}>
              <SelectTrigger className="w-auto h-7 px-2.5 rounded-md border-0 bg-accent text-xs font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASPECT_RATIO_OPTIONS.map(ar => (
                  <SelectItem key={ar} value={ar}>{ar}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isProModel && (
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger className="w-auto h-7 px-2.5 rounded-md border-0 bg-accent text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOLUTION_OPTIONS.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Chat area */}
          <ScrollArea className="flex-1 min-h-0" ref={scrollRef as any}>
            <div className="max-w-2xl mx-auto px-5 py-6 space-y-5">
              {loadingHistory && (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {!loadingHistory && generations.length === 0 && (
                <div className="flex flex-col items-center justify-center py-28 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mb-4">
                    <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground">Describe the image you want to create</p>
                </div>
              )}

              {generations.map(gen => (
                <div key={gen.id} className="space-y-3">
                  {/* Prompt */}
                  <div className="flex justify-end">
                    <div className="bg-foreground text-background rounded-2xl rounded-tr-md px-4 py-3 max-w-[75%]">
                      <p className="text-sm leading-relaxed">{gen.prompt}</p>
                      <p className="text-[10px] opacity-40 mt-1.5">
                        {modelLabel(gen.model)} · {gen.aspect_ratio}
                        {gen.resolution !== "1K" ? ` · ${gen.resolution}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Image */}
                  <div className="flex justify-start">
                    {gen.image_url ? (
                      <div className="group relative rounded-2xl rounded-tl-md overflow-hidden bg-accent max-w-[75%]">
                        <img
                          src={gen.image_url}
                          alt={gen.prompt}
                          className="max-w-full rounded-2xl rounded-tl-md cursor-pointer"
                          onClick={() => setFullscreenImage(gen.image_url)}
                          loading="lazy"
                        />
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className="h-7 w-7 rounded-lg bg-background/80 backdrop-blur-sm hover:bg-background flex items-center justify-center shadow-sm"
                            onClick={() => handleDownload(gen.image_url!, gen.prompt)}
                          >
                            <Download className="w-3 h-3" />
                          </button>
                          <button
                            className="h-7 w-7 rounded-lg bg-background/80 backdrop-blur-sm hover:bg-background flex items-center justify-center shadow-sm"
                            onClick={() => handleDelete(gen.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-accent rounded-2xl rounded-tl-md px-5 py-6 flex items-center gap-2.5">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Generating...</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input area */}
          <div className="border-t border-border/50 bg-background">
            <div className="max-w-2xl mx-auto px-5 py-3 space-y-2">
              {/* Reference images */}
              {refImages.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {refImages.map((ref, i) => (
                    <div key={i} className="relative w-11 h-11 rounded-lg overflow-hidden group">
                      <img src={ref.previewUrl} alt={`Ref ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => {
                          URL.revokeObjectURL(ref.previewUrl);
                          setRefImages(prev => prev.filter((_, idx) => idx !== i));
                        }}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                  {refImages.length < MAX_REF_IMAGES && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-11 h-11 rounded-lg border border-dashed border-border hover:border-muted-foreground/50 flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-end gap-2">
                <button
                  className="h-10 w-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isGenerating || refImages.length >= MAX_REF_IMAGES}
                >
                  <Upload className="w-4 h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    const remaining = MAX_REF_IMAGES - refImages.length;
                    const toAdd = files.slice(0, remaining).map(f => ({
                      file: f, previewUrl: URL.createObjectURL(f),
                    }));
                    setRefImages(prev => [...prev, ...toAdd]);
                    e.target.value = "";
                  }}
                />
                <Textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe the image you want..."
                  className="min-h-[44px] max-h-[120px] resize-none text-sm rounded-xl border-border/50 bg-accent/50"
                  disabled={isGenerating}
                  rows={1}
                />
                <Button
                  size="icon"
                  className="h-10 w-10 rounded-xl flex-shrink-0 bg-foreground text-background hover:bg-foreground/90"
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating}
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </main>
      </AppLayout>

      {/* Fullscreen */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center cursor-pointer"
          onClick={() => setFullscreenImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/60 hover:text-white z-10 h-10 w-10 flex items-center justify-center"
            onClick={() => setFullscreenImage(null)}
          >
            <X className="w-5 h-5" />
          </button>
          <img src={fullscreenImage} alt="Full size" className="max-w-[90vw] max-h-[90vh] object-contain" />
        </div>
      )}
    </>
  );
};

export default TextToImage;
