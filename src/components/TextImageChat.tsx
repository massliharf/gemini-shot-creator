import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Loader2, ImageIcon, Trash2, Download, X, Plus, Upload } from "lucide-react";
import { SmartImage } from "@/components/SmartImage";

const MAX_REF_IMAGES = 5;

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

interface RefImage {
  file: File;
  previewUrl: string;
}

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
  { value: "flash", label: "FLASH" },
  { value: "flash-3.1", label: "3.1 FLASH" },
  { value: "pro", label: "PRO" },
];

const ASPECT_RATIO_OPTIONS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9"];
const RESOLUTION_OPTIONS = ["1K", "2K", "4K"];

interface TextImageChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TextImageChat = ({ open, onOpenChange }: TextImageChatProps) => {
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

  const isProModel = model === "pro" || model === "flash-3.1";

  // Load history
  useEffect(() => {
    if (!open) return;
    loadHistory();
  }, [open]);

  // Scroll to bottom on new generation
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
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
    } catch (e) {
      console.error("Failed to load history:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    const currentPrompt = prompt;
    setPrompt("");
    setIsGenerating(true);

    // Optimistic entry
    const tempId = `temp-${Date.now()}`;
    const tempGen: Generation = {
      id: tempId,
      prompt: currentPrompt,
      model,
      aspect_ratio: aspectRatio,
      resolution,
      image_url: null,
      created_at: new Date().toISOString(),
    };
    setGenerations(prev => [...prev, tempGen]);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const resp = await supabase.functions.invoke("generate-text-image", {
        body: {
          prompt: currentPrompt,
          model,
          aspectRatio,
          resolution: isProModel ? resolution : "1K",
        },
      });

      const data = resp.data;

      if (!data?.success) {
        toast.error(data?.message || "Generation failed");
        setGenerations(prev => prev.filter(g => g.id !== tempId));
        return;
      }

      // Replace temp with real data
      await loadHistory();
      toast.success("Image generated!");
    } catch (e) {
      console.error("Generation error:", e);
      toast.error("Generation failed");
      setGenerations(prev => prev.filter(g => g.id !== tempId));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("text_generations").delete().eq("id", id);
      if (error) throw error;
      setGenerations(prev => prev.filter(g => g.id !== id));
      toast.success("Deleted");
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  const handleDownload = async (imageUrl: string, prompt: string) => {
    try {
      const resp = await fetch(imageUrl);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${prompt.substring(0, 30).replace(/[^a-zA-Z0-9]/g, "_")}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const modelLabel = (m: string) => {
    if (m.includes("3.1-flash")) return "3.1 FLASH";
    if (m.includes("pro")) return "PRO";
    return "FLASH";
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-[420px] sm:w-[480px] p-0 flex flex-col bg-background">
          <SheetHeader className="px-4 py-3 border-b border-border">
            <SheetTitle className="text-base">Text to Image</SheetTitle>
          </SheetHeader>

          {/* Controls */}
          <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-wrap">
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={aspectRatio} onValueChange={setAspectRatio}>
              <SelectTrigger className="w-[80px] h-8 text-xs">
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
                <SelectTrigger className="w-[70px] h-8 text-xs">
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
            <div className="p-4 space-y-4">
              {loadingHistory && (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {!loadingHistory && generations.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ImageIcon className="w-12 h-12 text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">Type a prompt to generate an image</p>
                </div>
              )}

              {generations.map(gen => (
                <div key={gen.id} className="space-y-2">
                  {/* Prompt bubble */}
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%]">
                      <p className="text-sm">{gen.prompt}</p>
                      <p className="text-[10px] opacity-60 mt-1">
                        {modelLabel(gen.model)} · {gen.aspect_ratio}
                        {gen.resolution !== "1K" ? ` · ${gen.resolution}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Image result */}
                  <div className="flex justify-start">
                    {gen.image_url ? (
                      <div className="group relative rounded-2xl rounded-tl-sm overflow-hidden bg-muted max-w-[85%]">
                        <img
                          src={gen.image_url}
                          alt={gen.prompt}
                          className="max-w-full rounded-2xl rounded-tl-sm cursor-pointer"
                          onClick={() => setFullscreenImage(gen.image_url)}
                          loading="lazy"
                        />
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm"
                            onClick={() => handleDownload(gen.image_url!, gen.prompt)}
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm"
                            onClick={() => handleDelete(gen.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-6 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Generating...</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="px-4 py-3 border-t border-border">
            <div className="flex items-end gap-2">
              <Textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe the image you want..."
                className="min-h-[44px] max-h-[120px] resize-none text-sm rounded-xl"
                disabled={isGenerating}
                rows={1}
              />
              <Button
                size="icon"
                className="h-10 w-10 rounded-xl flex-shrink-0"
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Fullscreen image overlay */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center cursor-pointer"
          onClick={() => setFullscreenImage(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/10 z-10"
            onClick={() => setFullscreenImage(null)}
          >
            <X className="w-6 h-6" />
          </Button>
          <img
            src={fullscreenImage}
            alt="Full size"
            className="max-w-[90vw] max-h-[90vh] object-contain"
          />
        </div>
      )}
    </>
  );
};
