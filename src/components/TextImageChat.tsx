import { useState, useEffect, useRef, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Send, Loader2, ImageIcon, Trash2, Download, X, Plus, Upload,
  RefreshCw, AlertCircle, Check
} from "lucide-react";
import { FullscreenImageView } from "@/components/FullscreenImageView";

const MAX_REF_IMAGES = 5;

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

interface RefImage {
  file: File;
  previewUrl: string;
}

type GenStatus = "generating" | "success" | "error";

interface GalleryItem {
  id: string;
  prompt: string;
  model: string;
  aspect_ratio: string;
  resolution: string;
  image_url: string | null;
  created_at: string;
  status: GenStatus;
  error?: string;
}

const MODEL_OPTIONS = [
  { value: "flash", label: "FLASH" },
  { value: "flash-3.1", label: "3.1 FLASH" },
  { value: "pro", label: "PRO" },
];

const ASPECT_RATIO_OPTIONS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9"];
const RESOLUTION_OPTIONS = ["1K", "2K", "4K"];
const COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10, 12];

interface TextImageChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CHAT_SETTINGS_KEY = "text-image-chat-settings";
const loadChatSettings = () => {
  try { const s = localStorage.getItem(CHAT_SETTINGS_KEY); if (s) return JSON.parse(s); } catch {} return {};
};

export const TextImageChat = ({ open, onOpenChange }: TextImageChatProps) => {
  const saved = loadChatSettings();
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(saved.model || "flash-3.1");
  const [aspectRatio, setAspectRatio] = useState(saved.aspectRatio || "1:1");
  const [resolution, setResolution] = useState(saved.resolution || "1K");
  const [imageCount, setImageCount] = useState(saved.imageCount || 1);
  const [activeGenerations, setActiveGenerations] = useState(0);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [refImages, setRefImages] = useState<RefImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist settings
  useEffect(() => {
    try { localStorage.setItem(CHAT_SETTINGS_KEY, JSON.stringify({ model, aspectRatio, resolution, imageCount })); } catch {}
  }, [model, aspectRatio, resolution, imageCount]);
  const galleryRef = useRef<HTMLDivElement>(null);

  // Fullscreen state
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);

  const isProModel = model === "pro" || model === "flash-3.1";
  const isGenerating = activeGenerations > 0;

  // Load history
  useEffect(() => {
    if (!open || historyLoaded) return;
    loadHistory();
  }, [open, historyLoaded]);

  // Scroll to top on new items
  useEffect(() => {
    if (galleryRef.current) {
      galleryRef.current.scrollTop = 0;
    }
  }, [items.length]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("text_generations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      setItems(
        (data || []).map((d: any) => ({
          ...d,
          status: "success" as GenStatus,
        }))
      );
      setHistoryLoaded(true);
    } catch (e) {
      console.error("Failed to load history:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const generateSingle = useCallback(
    async (
      genPrompt: string,
      genModel: string,
      genAR: string,
      genRes: string,
      refImgs: RefImage[],
      tempId: string
    ) => {
      try {
        const referenceImages: { base64: string; mimeType: string }[] = [];
        for (const ref of refImgs) {
          try {
            const b64 = await fileToBase64(ref.file);
            referenceImages.push({ base64: b64, mimeType: ref.file.type || "image/jpeg" });
          } catch {
            // skip failed ref images
          }
        }

        const resp = await supabase.functions.invoke("generate-text-image", {
          body: {
            prompt: genPrompt,
            model: genModel,
            aspectRatio: genAR,
            resolution: (genModel === "pro" || genModel === "flash-3.1") ? genRes : "1K",
            referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
          },
        });

        const data = resp.data;
        if (!data?.success) {
          setItems((prev) =>
            prev.map((it) =>
              it.id === tempId
                ? { ...it, status: "error" as GenStatus, error: data?.message || "Generation failed" }
                : it
            )
          );
          return;
        }

        // Replace temp with real data
        setItems((prev) =>
          prev.map((it) =>
            it.id === tempId
              ? { ...it, status: "success" as GenStatus, image_url: data.imageUrl }
              : it
          )
        );
      } catch (e: any) {
        setItems((prev) =>
          prev.map((it) =>
            it.id === tempId
              ? { ...it, status: "error" as GenStatus, error: e?.message || "Generation failed" }
              : it
          )
        );
      } finally {
        setActiveGenerations((prev) => prev - 1);
      }
    },
    []
  );

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    const currentPrompt = prompt;
    const currentModel = model;
    const currentAR = aspectRatio;
    const currentRes = resolution;
    const currentRefs = [...refImages];
    const count = imageCount;

    setPrompt("");

    // Create temp items
    const tempItems: GalleryItem[] = [];
    for (let i = 0; i < count; i++) {
      tempItems.push({
        id: `temp-${Date.now()}-${i}`,
        prompt: currentPrompt,
        model: currentModel,
        aspect_ratio: currentAR,
        resolution: currentRes,
        image_url: null,
        created_at: new Date().toISOString(),
        status: "generating",
      });
    }

    // Prepend (newest first)
    setItems((prev) => [...tempItems, ...prev]);
    setActiveGenerations((prev) => prev + count);

    // Fire all in parallel
    for (const item of tempItems) {
      generateSingle(currentPrompt, currentModel, currentAR, currentRes, currentRefs, item.id);
    }
  };

  const handleRegenerate = (item: GalleryItem) => {
    const tempId = `temp-${Date.now()}`;
    const newItem: GalleryItem = {
      id: tempId,
      prompt: item.prompt,
      model: item.model || model,
      aspect_ratio: item.aspect_ratio || aspectRatio,
      resolution: item.resolution || resolution,
      image_url: null,
      created_at: new Date().toISOString(),
      status: "generating",
    };

    // Insert at top
    setItems((prev) => [newItem, ...prev]);
    setActiveGenerations((prev) => prev + 1);
    generateSingle(item.prompt, item.model || model, item.aspect_ratio || aspectRatio, item.resolution || resolution, refImages, tempId);
  };

  const handleDelete = async (id: string) => {
    if (id.startsWith("temp-")) {
      setItems((prev) => prev.filter((g) => g.id !== id));
      return;
    }
    try {
      const { error } = await supabase.from("text_generations").delete().eq("id", id);
      if (error) throw error;
      setItems((prev) => prev.filter((g) => g.id !== id));
    } catch {
      toast.error("Delete failed");
    }
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

  // Fullscreen navigation
  const successItems = items.filter((it) => it.status === "success" && it.image_url);
  const fullscreenItem = fullscreenIndex !== null ? successItems[fullscreenIndex] : null;

  const openFullscreen = (item: GalleryItem) => {
    const idx = successItems.findIndex((si) => si.id === item.id);
    if (idx >= 0) setFullscreenIndex(idx);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-[90vw] sm:w-[640px] lg:w-[800px] p-0 flex flex-col bg-background">
          <SheetHeader className="px-4 py-3 border-b border-border">
            <SheetTitle className="text-base flex items-center gap-2">
              Text to Image
              {isGenerating && (
                <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {activeGenerations} generating...
                </span>
              )}
            </SheetTitle>
          </SheetHeader>

          {/* Controls */}
          <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 flex-wrap">
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-[110px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={aspectRatio} onValueChange={setAspectRatio}>
              <SelectTrigger className="w-[75px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASPECT_RATIO_OPTIONS.map((ar) => (
                  <SelectItem key={ar} value={ar}>
                    {ar}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isProModel && (
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger className="w-[65px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOLUTION_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-xs text-muted-foreground">Count:</span>
              <Select value={String(imageCount)} onValueChange={(v) => setImageCount(Number(v))}>
                <SelectTrigger className="w-[60px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNT_OPTIONS.map((c) => (
                    <SelectItem key={c} value={String(c)}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Gallery */}
          <ScrollArea className="flex-1 min-h-0" ref={galleryRef as any}>
            <div className="p-3">
              {loadingHistory && (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {!loadingHistory && items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mb-3">
                    <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm text-muted-foreground">Type a prompt to generate images</p>
                </div>
              )}

              {!loadingHistory && items.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {items.map((item) => (
                    <GalleryCard
                      key={item.id}
                      item={item}
                      onRegenerate={() => handleRegenerate(item)}
                      onDelete={() => handleDelete(item.id)}
                      onDownload={() => item.image_url && handleDownload(item.image_url, item.prompt)}
                      onClick={() => openFullscreen(item)}
                    />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="px-4 py-3 border-t border-border space-y-2">
            {/* Reference image thumbnails */}
            {refImages.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {refImages.map((ref, i) => (
                  <div key={i} className="relative w-11 h-11 rounded-lg overflow-hidden group">
                    <img src={ref.previewUrl} alt={`Ref ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => {
                        URL.revokeObjectURL(ref.previewUrl);
                        setRefImages((prev) => prev.filter((_, idx) => idx !== i));
                      }}
                      className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                {refImages.length < MAX_REF_IMAGES && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-11 h-11 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            )}

            <div className="flex items-end gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl flex-shrink-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={isGenerating || refImages.length >= MAX_REF_IMAGES}
              >
                <Upload className="w-4 h-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  const remaining = MAX_REF_IMAGES - refImages.length;
                  const toAdd = files.slice(0, remaining).map((f) => ({
                    file: f,
                    previewUrl: URL.createObjectURL(f),
                  }));
                  setRefImages((prev) => [...prev, ...toAdd]);
                  e.target.value = "";
                }}
              />
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe the image you want..."
                className="min-h-[44px] max-h-[120px] resize-none text-sm rounded-xl"
                rows={1}
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

      {/* Fullscreen viewer */}
      <FullscreenImageView
        isOpen={fullscreenIndex !== null}
        onClose={() => setFullscreenIndex(null)}
        imageUrl={fullscreenItem?.image_url || null}
        sceneName={fullscreenItem?.prompt}
        sceneId={fullscreenIndex !== null ? fullscreenIndex + 1 : undefined}
        onDownload={
          fullscreenItem?.image_url
            ? () => handleDownload(fullscreenItem.image_url!, fullscreenItem.prompt)
            : undefined
        }
        onRegenerate={fullscreenItem ? () => handleRegenerate(fullscreenItem) : undefined}
        onPrevious={fullscreenIndex !== null && fullscreenIndex > 0 ? () => setFullscreenIndex(fullscreenIndex - 1) : undefined}
        onNext={
          fullscreenIndex !== null && fullscreenIndex < successItems.length - 1
            ? () => setFullscreenIndex(fullscreenIndex + 1)
            : undefined
        }
        hasPrevious={fullscreenIndex !== null && fullscreenIndex > 0}
        hasNext={fullscreenIndex !== null && fullscreenIndex < successItems.length - 1}
      />
    </>
  );
};

// --- Gallery Card Component ---
interface GalleryCardProps {
  item: GalleryItem;
  onRegenerate: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onClick: () => void;
}

const GalleryCard = ({ item, onRegenerate, onDelete, onDownload, onClick }: GalleryCardProps) => {
  const isGenerating = item.status === "generating";
  const isError = item.status === "error";
  const isSuccess = item.status === "success" && !!item.image_url;

  return (
    <div className="relative bg-accent/40 dark:bg-accent/60 overflow-hidden group cursor-pointer rounded-lg aspect-square flex flex-col">
      {/* Status badge */}
      <div className="absolute top-1.5 left-1.5 z-10">
        {isGenerating && (
          <span className="text-[10px] font-medium bg-primary/90 text-primary-foreground backdrop-blur-sm px-1.5 py-0.5 rounded-md flex items-center gap-1">
            <Loader2 className="w-2.5 h-2.5 animate-spin" />
            Generating
          </span>
        )}
        {isError && (
          <span className="text-[10px] font-medium bg-destructive/90 text-destructive-foreground backdrop-blur-sm px-1.5 py-0.5 rounded-md flex items-center gap-1">
            <AlertCircle className="w-2.5 h-2.5" />
            Failed
          </span>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 relative" onClick={() => isSuccess && onClick()}>
        {isSuccess ? (
          <>
            <img
              src={item.image_url!}
              alt={item.prompt}
              className="w-full h-full object-cover"
              loading="lazy"
            />

            {/* Hover overlay with actions */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
              <button
                className="h-7 w-7 rounded-lg bg-background/90 backdrop-blur-sm hover:bg-background flex items-center justify-center shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRegenerate();
                }}
              >
                <RefreshCw className="w-3 h-3" />
              </button>
              <button
                className="h-7 w-7 rounded-lg bg-background/90 backdrop-blur-sm hover:bg-background flex items-center justify-center shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload();
                }}
              >
                <Download className="w-3 h-3" />
              </button>
              <button
                className="h-7 w-7 rounded-lg bg-background/90 backdrop-blur-sm hover:bg-background flex items-center justify-center shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            {/* Prompt tooltip on hover */}
            <div className="absolute top-0 left-0 right-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-[10px] text-white bg-black/60 backdrop-blur-sm rounded-md px-1.5 py-1 line-clamp-2">
                {item.prompt}
              </p>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-3">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 text-muted-foreground/50 animate-spin" />
                <p className="text-[10px] text-muted-foreground/60 text-center line-clamp-2">{item.prompt}</p>
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center gap-2">
                <AlertCircle className="w-5 h-5 text-destructive/60" />
                <p className="text-[10px] text-destructive/80 text-center line-clamp-2">{item.error || "Failed"}</p>
                <div className="flex gap-1">
                  <button
                    onClick={onRegenerate}
                    className="text-[10px] font-medium text-foreground/70 hover:text-foreground bg-accent rounded-md px-2 py-1 transition-colors"
                  >
                    Retry
                  </button>
                  <button
                    onClick={onDelete}
                    className="text-[10px] font-medium text-destructive/70 hover:text-destructive bg-accent rounded-md px-2 py-1 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
