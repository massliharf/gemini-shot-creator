import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2, ImageIcon, Trash2, Download, X, Plus, Upload,
  RefreshCw, AlertCircle, Archive, XCircle, Sparkles, TextCursorInput,
} from "lucide-react";
import { cn } from "@/lib/utils";
import JSZip from "jszip";
import { triggerDownload, mapLimit, chunkArray } from "@/lib/download-utils";
import { AppLayout } from "@/components/AppLayout";
import { FullscreenImageView } from "@/components/FullscreenImageView";
import { User } from "@supabase/supabase-js";
import { MediaAction, mediaActionsVisibility, PromptIdeas, ResultGrid, ResultGroup, SampleResultsFeed, ToolHeader } from "@/components/results";

const MAX_REF_IMAGES = 5;
const SETTINGS_KEY = "text-to-image-settings";

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

interface RefImage { file: File; previewUrl: string; }

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
  { value: "flash", label: "Flash" },
  { value: "flash-3.1", label: "3.1 Flash" },
  { value: "pro", label: "Pro" },
];

const ASPECT_RATIO_OPTIONS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9"];
const RESOLUTION_OPTIONS = ["1K", "2K", "4K"];
const COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10, 12];

const loadSettings = () => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return {};
};

const TextToImage = () => {
  const savedSettings = loadSettings();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(savedSettings.model || "flash-3.1");
  const [aspectRatio, setAspectRatio] = useState(savedSettings.aspectRatio || "1:1");
  const [resolution, setResolution] = useState(savedSettings.resolution || "1K");
  const [imageCount, setImageCount] = useState(savedSettings.imageCount || 1);
  const [activeGenerations, setActiveGenerations] = useState(0);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [refImages, setRefImages] = useState<RefImage[]>([]);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const isProModel = model === "pro" || model === "flash-3.1";
  const isGenerating = activeGenerations > 0;

  // Persist settings
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ model, aspectRatio, resolution, imageCount }));
    } catch { /* ignore */ }
  }, [model, aspectRatio, resolution, imageCount]);

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

  useEffect(() => { if (user && !historyLoaded) loadHistory(); }, [user, historyLoaded]);

  // Deep link: /text-to-image?prompt=... prefills the prompt once, then the param is dropped
  // so picking the same prompt again (⌘K, templates) re-applies it and a reload doesn't refill it.
  const promptParam = searchParams.get("prompt");
  useEffect(() => {
    if (!promptParam) return;
    setPrompt(promptParam);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("prompt");
        return next;
      },
      { replace: true },
    );
  }, [promptParam, setSearchParams]);

  /** Fills the prompt field (ideas, "Use prompt") and moves focus there. */
  const applyPrompt = (text: string) => {
    setPrompt(text);
    requestAnimationFrame(() => {
      const el = promptRef.current;
      if (!el) return;
      if (window.matchMedia("(max-width: 1023px)").matches) el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus({ preventScroll: true });
      el.setSelectionRange(text.length, text.length);
    });
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      // Load all generations in batches of 1000
      let allData: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data, error: batchError } = await supabase
          .from("text_generations")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, from + batchSize - 1);
        if (batchError) throw batchError;
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          from += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }
      setItems(allData.map((d: any) => ({ ...d, status: "success" as GenStatus })));
      setHistoryLoaded(true);
    } catch (e) { console.error("Failed to load history:", e); }
    finally { setLoadingHistory(false); }
  };

  const generateSingle = useCallback(
    async (genPrompt: string, genModel: string, genAR: string, genRes: string, refImgs: RefImage[], tempId: string) => {
      try {
        const referenceImages: { base64: string; mimeType: string }[] = [];
        for (const ref of refImgs) {
          try {
            const b64 = await fileToBase64(ref.file);
            referenceImages.push({ base64: b64, mimeType: ref.file.type || "image/jpeg" });
          } catch { /* skip */ }
        }

        const resp = await supabase.functions.invoke("generate-text-image", {
          body: {
            prompt: genPrompt, model: genModel, aspectRatio: genAR,
            resolution: (genModel === "pro" || genModel === "flash-3.1") ? genRes : "1K",
            referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
          },
        });

        const data = resp.data;
        if (!data?.success) {
          setItems((prev) => prev.map((it) => it.id === tempId ? { ...it, status: "error" as GenStatus, error: data?.message || "Generation failed" } : it));
          return;
        }
        setItems((prev) => prev.map((it) => it.id === tempId ? { ...it, status: "success" as GenStatus, image_url: data.imageUrl } : it));
      } catch (e: any) {
        setItems((prev) => prev.map((it) => it.id === tempId ? { ...it, status: "error" as GenStatus, error: e?.message || "Generation failed" } : it));
      } finally {
        setActiveGenerations((prev) => prev - 1);
      }
    }, []
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

    const tempItems: GalleryItem[] = [];
    for (let i = 0; i < count; i++) {
      tempItems.push({
        id: `temp-${Date.now()}-${i}`,
        prompt: currentPrompt, model: currentModel, aspect_ratio: currentAR,
        resolution: currentRes, image_url: null, created_at: new Date().toISOString(), status: "generating",
      });
    }
    setItems((prev) => [...tempItems, ...prev]);
    setActiveGenerations((prev) => prev + count);
    for (const item of tempItems) {
      generateSingle(currentPrompt, currentModel, currentAR, currentRes, currentRefs, item.id);
    }
  };

  const handleRegenerate = (item: GalleryItem) => {
    const tempId = `temp-${Date.now()}`;
    const newItem: GalleryItem = {
      id: tempId, prompt: item.prompt, model: item.model || model,
      aspect_ratio: item.aspect_ratio || aspectRatio, resolution: item.resolution || resolution,
      image_url: null, created_at: new Date().toISOString(), status: "generating",
    };
    setItems((prev) => [newItem, ...prev]);
    setActiveGenerations((prev) => prev + 1);
    generateSingle(item.prompt, item.model || model, item.aspect_ratio || aspectRatio, item.resolution || resolution, refImages, tempId);
  };

  const handleDelete = async (id: string) => {
    if (id.startsWith("temp-")) { setItems((prev) => prev.filter((g) => g.id !== id)); return; }
    try {
      const { error } = await supabase.from("text_generations").delete().eq("id", id);
      if (error) throw error;
      setItems((prev) => prev.filter((g) => g.id !== id));
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

  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingAndDeleting, setDownloadingAndDeleting] = useState(false);

  const ZIP_BATCH_SIZE = 100;

  const buildZipAndDownload = async (downloadable: GalleryItem[]) => {
    const failed: string[] = [];
    const batches = chunkArray(downloadable, ZIP_BATCH_SIZE);
    const dateStr = new Date().toISOString().slice(0, 10);

    for (let b = 0; b < batches.length; b++) {
      const batch = batches[b];
      const zip = new JSZip();
      const manifest = batch.map((it, i) => ({
        file: `${String(i + 1).padStart(3, "0")}.png`,
        prompt: it.prompt,
        model: it.model,
        aspect_ratio: it.aspect_ratio,
        resolution: it.resolution,
        created_at: it.created_at,
      }));
      zip.file("prompts.json", JSON.stringify(manifest, null, 2));
      const textLines = batch.map((it, i) =>
        `${String(i + 1).padStart(3, "0")}.png\n  Prompt: ${it.prompt}\n  Model: ${it.model} | AR: ${it.aspect_ratio} | Res: ${it.resolution}\n  Date: ${it.created_at}`
      );
      zip.file("prompts.txt", textLines.join("\n\n"));

      await mapLimit(batch, 16, async (it, idx) => {
        try {
          const resp = await fetch(it.image_url!, { cache: "force-cache" });
          if (!resp.ok) throw new Error(String(resp.status));
          const buf = await resp.arrayBuffer();
          const base = String(idx + 1).padStart(3, "0");
          zip.file(`${base}.png`, buf, { compression: "STORE" });
          zip.file(`${base}.txt`, it.prompt, { compression: "STORE" });
        } catch {
          failed.push(it.id);
        }
      });

      const content = await zip.generateAsync({ type: "blob", compression: "STORE" });
      const url = URL.createObjectURL(content);
      const filename = batches.length > 1
        ? `text-to-image-${dateStr}-part-${b + 1}-of-${batches.length}.zip`
        : `text-to-image-${dateStr}.zip`;
      triggerDownload(url, filename);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
    return failed;
  };

  const handleDownloadAll = async () => {
    const downloadable = items.filter((it) => it.status === "success" && it.image_url);
    if (downloadable.length === 0) { toast.info("No images to download"); return; }
    setDownloadingAll(true);
    try {
      await buildZipAndDownload(downloadable);
      toast.success(`${downloadable.length} image downloaded as ZIP`);
    } catch (e: any) {
      console.error("Download all failed:", e);
      toast.error("Download failed");
    } finally {
      setDownloadingAll(false);
    }
  };

  const handleDownloadAllAndDelete = async () => {
    const downloadable = items.filter((it) => it.status === "success" && it.image_url);
    if (downloadable.length === 0) { toast.info("No images to download"); return; }
    const ok = window.confirm(
      `${downloadable.length} görsel ZIP olarak indirilecek ve ardından buradan silinecek. Devam edilsin mi?`
    );
    if (!ok) return;

    setDownloadingAndDeleting(true);
    try {
      const failed = await buildZipAndDownload(downloadable);
      const toDelete = downloadable.filter((it) => !failed.includes(it.id) && !it.id.startsWith("temp-"));
      const ids = toDelete.map((it) => it.id);
      if (ids.length > 0) {
        const { error } = await supabase.from("text_generations").delete().in("id", ids);
        if (error) throw error;
        setItems((prev) => prev.filter((g) => !ids.includes(g.id)));
      }
      if (failed.length > 0) {
        toast.warning(`${ids.length} indirildi ve silindi. ${failed.length} görsel indirilemediği için silinmedi.`);
      } else {
        toast.success(`${ids.length} görsel indirildi ve silindi`);
      }
    } catch (e: any) {
      console.error("Download & delete failed:", e);
      toast.error("İşlem başarısız — görseller silinmedi");
    } finally {
      setDownloadingAndDeleting(false);
    }
  };

  // Fullscreen
  const successItems = items.filter((it) => it.status === "success" && it.image_url);
  const fullscreenItem = fullscreenIndex !== null ? successItems[fullscreenIndex] : null;
  const openFullscreen = (item: GalleryItem) => {
    const idx = successItems.findIndex((si) => si.id === item.id);
    if (idx >= 0) setFullscreenIndex(idx);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-5 animate-spin text-muted-foreground" strokeWidth={1.5} aria-label="Loading" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <>
      <AppLayout userEmail={user.email}>
        <main className="flex-1 min-h-0 min-w-0 bg-background flex flex-col lg:flex-row gap-2 p-2 overflow-y-auto lg:overflow-hidden">
          {/* Tool panel */}
          <aside
            aria-label="Text to Image settings"
            className="w-full lg:w-tool-panel shrink-0 bg-card rounded-lg p-3 flex flex-col gap-4 lg:h-full lg:min-h-0 lg:overflow-y-auto"
          >
            {/* Tool title card */}
            <ToolHeader icon={ImageIcon} category="image" title="Text to Image" description="Describe it, get images in seconds" />

            {/* Settings */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-4">
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="tti-model">Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger id="tti-model" aria-label="Model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="tti-count">Count</Label>
                <Select value={String(imageCount)} onValueChange={(v) => setImageCount(Number(v))}>
                  <SelectTrigger id="tti-count">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNT_OPTIONS.map(c => <SelectItem key={c} value={String(c)}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className={cn("space-y-1.5 min-w-0", !isProModel && "col-span-2")}>
                <Label htmlFor="tti-aspect">Aspect ratio</Label>
                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                  <SelectTrigger id="tti-aspect" aria-label="Aspect ratio">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASPECT_RATIO_OPTIONS.map(ar => <SelectItem key={ar} value={ar}>{ar}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {isProModel && (
                <div className="space-y-1.5 min-w-0">
                  <Label htmlFor="tti-resolution">Resolution</Label>
                  <Select value={resolution} onValueChange={setResolution}>
                    <SelectTrigger id="tti-resolution" aria-label="Resolution">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOLUTION_OPTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* References */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>References</Label>
                <span className="text-caption text-muted-foreground tabular-nums">{refImages.length}/{MAX_REF_IMAGES}</span>
              </div>
              <div className="flex gap-2 flex-wrap items-start">
                {refImages.length > 0 && (
                  <div className="contents" aria-label="Reference images">
                    {refImages.map((ref, i) => (
                      <div key={i} className="relative group size-[65px] rounded-md overflow-hidden bg-control">
                        <img src={ref.previewUrl} alt={`Ref ${i + 1}`} className="size-full object-cover" />
                        <span className="absolute bottom-0 inset-x-0 px-1 py-0.5 text-micro text-white bg-foreground/25">Ref {i + 1}</span>
                        <button
                          type="button"
                          aria-label={`Remove reference ${i + 1}`}
                          onClick={() => { URL.revokeObjectURL(ref.previewUrl); setRefImages(prev => prev.filter((_, idx) => idx !== i)); }}
                          className="absolute top-1 right-1 size-5 rounded-full bg-card/90 text-foreground flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <X className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                    {refImages.length < MAX_REF_IMAGES && (
                      <Button type="button" variant="ghost" size="xs" className="basis-full order-last self-start text-muted-foreground" onClick={() => fileInputRef.current?.click()}>
                        <Plus strokeWidth={1.5} aria-hidden="true" />
                        Add reference
                      </Button>
                    )}
                  </div>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  className="dropzone size-[65px] flex-col gap-1 text-caption text-muted-foreground hover:text-foreground [&_svg]:size-4"
                  aria-label="Upload reference image"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={refImages.length >= MAX_REF_IMAGES}
                >
                  <Upload strokeWidth={1.5} aria-hidden="true" />
                  <span aria-hidden="true">Add</span>
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    const remaining = MAX_REF_IMAGES - refImages.length;
                    const toAdd = files.slice(0, remaining).map(f => ({ file: f, previewUrl: URL.createObjectURL(f) }));
                    setRefImages(prev => [...prev, ...toAdd]);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            {/* Prompt */}
            <div className="space-y-1.5 flex-1 flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="tti-prompt">Prompt</Label>
                {prompt.length > 0 && (
                  <button
                    type="button"
                    onClick={() => applyPrompt("")}
                    className="text-caption text-muted-foreground hover:text-foreground rounded-xs transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Clear
                  </button>
                )}
              </div>
              <Textarea
                ref={promptRef}
                id="tti-prompt"
                value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="Describe the image you want..."
                className="min-h-[112px] lg:flex-1 text-body-md resize-none"
                rows={4}
                aria-describedby="tti-prompt-hint"
              />
              <p id="tti-prompt-hint" className="hidden md:block text-caption text-tertiary-foreground">
                Enter to generate · Shift + Enter for a new line
              </p>
              {!prompt.trim() && <PromptIdeas onSelect={applyPrompt} className="pt-2" />}
            </div>

            {/* Generate */}
            <div className="sticky bottom-0 -mx-3 -mb-3 px-3 pb-3 pt-2 bg-card safe-bottom">
              <Button
                size="lg"
                fullWidth
                onClick={handleGenerate} disabled={!prompt.trim()}
              >
                Generate
                {isGenerating ? <Loader2 className="animate-spin" strokeWidth={1.5} aria-hidden="true" /> : <Sparkles strokeWidth={1.5} aria-hidden="true" />}
              </Button>
            </div>
          </aside>

          {/* Results feed */}
          <section aria-label="Results" className="flex-1 min-w-0 flex flex-col lg:min-h-0">
            {(isGenerating || successItems.length > 0) && (
            <div className="flex items-center gap-2 flex-wrap min-h-control-md px-1 pb-2">
              {isGenerating && (
                <Badge aria-live="polite">
                  <Loader2 className="animate-spin" strokeWidth={1.5} aria-hidden="true" />
                  {activeGenerations} generating
                </Badge>
              )}
              {successItems.length > 0 && (
                <div className="flex items-center gap-2 ml-auto flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadAll}
                    disabled={downloadingAll || downloadingAndDeleting}
                  >
                    {downloadingAll ? <Loader2 className="animate-spin" strokeWidth={1.5} aria-hidden="true" /> : <Archive strokeWidth={1.5} aria-hidden="true" />}
                    Download all ({successItems.length})
                  </Button>
                  <Button
                    variant="danger-outline"
                    size="sm"
                    onClick={handleDownloadAllAndDelete}
                    disabled={downloadingAll || downloadingAndDeleting}
                    title="ZIP olarak indir ve buradan sil"
                  >
                    {downloadingAndDeleting ? <Loader2 className="animate-spin" strokeWidth={1.5} aria-hidden="true" /> : <Trash2 strokeWidth={1.5} aria-hidden="true" />}
                    İndir & Sil
                  </Button>
                </div>
              )}
            </div>
            )}

            <ScrollArea className="flex-1 lg:min-h-0 [&_[data-radix-scroll-area-viewport]>div]:!block" ref={galleryRef as any}>
              <div className="space-y-3 pb-4">
                {loadingHistory && (
                  <div className="bg-app rounded-lg p-4 space-y-3" aria-busy="true" aria-label="Loading history">
                    <Skeleton className="h-6 w-1/2" />
                    <ResultGrid>
                      {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="aspect-square rounded-md" />
                      ))}
                    </ResultGrid>
                  </div>
                )}

                {!loadingHistory && items.length === 0 && (
                  <SampleResultsFeed onUsePrompt={applyPrompt} notice="Your generations will appear here." />
                )}

                {!loadingHistory && items.length > 0 && groupItems(items).map((group) => {
                  const head = group.items[0];
                  return (
                    <ResultGroup
                      key={group.key}
                      title={head.prompt}
                      meta={[MODEL_OPTIONS.find(o => o.value === head.model)?.label ?? head.model, head.aspect_ratio, head.resolution]}
                      createdAt={head.created_at}
                      actions={
                        <Button type="button" variant="ghost" size="xs" className="text-muted-foreground" onClick={() => applyPrompt(head.prompt)}>
                          <TextCursorInput strokeWidth={1.5} aria-hidden="true" />
                          Use prompt
                        </Button>
                      }
                    >
                      <ResultGrid>
                        {group.items.map((item) => (
                          <GalleryCard
                            key={item.id}
                            item={item}
                            onRegenerate={() => handleRegenerate(item)}
                            onDelete={() => handleDelete(item.id)}
                            onDownload={() => item.image_url && handleDownload(item.image_url, item.prompt)}
                            onClick={() => openFullscreen(item)}
                          />
                        ))}
                      </ResultGrid>
                    </ResultGroup>
                  );
                })}
              </div>
            </ScrollArea>
          </section>
        </main>
      </AppLayout>

      <FullscreenImageView
        isOpen={fullscreenIndex !== null}
        onClose={() => setFullscreenIndex(null)}
        imageUrl={fullscreenItem?.image_url || null}
        sceneName={fullscreenItem?.prompt}
        sceneId={fullscreenIndex !== null ? fullscreenIndex + 1 : undefined}
        onDownload={fullscreenItem?.image_url ? () => handleDownload(fullscreenItem.image_url!, fullscreenItem.prompt) : undefined}
        onRegenerate={fullscreenItem ? () => handleRegenerate(fullscreenItem) : undefined}
        onPrevious={fullscreenIndex !== null && fullscreenIndex > 0 ? () => setFullscreenIndex(fullscreenIndex - 1) : undefined}
        onNext={fullscreenIndex !== null && fullscreenIndex < successItems.length - 1 ? () => setFullscreenIndex(fullscreenIndex + 1) : undefined}
        hasPrevious={fullscreenIndex !== null && fullscreenIndex > 0}
        hasNext={fullscreenIndex !== null && fullscreenIndex < successItems.length - 1}
      />
    </>
  );
};

export default TextToImage;

// --- Presentation helpers (pure, render-time) ---
const GROUP_WINDOW_MS = 10 * 60 * 1000;

/** Groups consecutive items that share prompt + settings and were created within a 10 minute window. */
const groupItems = (list: GalleryItem[]) => {
  const groups: { key: string; items: GalleryItem[] }[] = [];
  for (const it of list) {
    const last = groups[groups.length - 1];
    const head = last?.items[0];
    if (
      head &&
      head.prompt === it.prompt &&
      head.model === it.model &&
      head.aspect_ratio === it.aspect_ratio &&
      head.resolution === it.resolution &&
      Math.abs(new Date(head.created_at).getTime() - new Date(it.created_at).getTime()) < GROUP_WINDOW_MS
    ) {
      last.items.push(it);
    } else {
      groups.push({ key: it.id, items: [it] });
    }
  }
  return groups;
};

// --- Gallery Card ---
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
    <div className="relative bg-control overflow-hidden group rounded-md aspect-square flex flex-col focus-within:ring-2 focus-within:ring-ring">
      <div className="absolute top-2 left-2 z-10">
        {isGenerating && (
          <Badge>
            <Loader2 className="animate-spin" strokeWidth={1.5} aria-hidden="true" />
            Generating
          </Badge>
        )}
        {isError && (
          <Badge variant="danger">
            <AlertCircle strokeWidth={1.5} aria-hidden="true" />
            Failed
          </Badge>
        )}
      </div>

      <div
        className={cn("flex-1 relative", isSuccess && "cursor-pointer")}
        onClick={() => isSuccess && onClick()}
        role={isSuccess ? "button" : undefined}
        tabIndex={isSuccess ? 0 : undefined}
        aria-label={isSuccess ? `Open image: ${item.prompt}` : undefined}
      >
        {isSuccess ? (
          <>
            <img src={item.image_url!} alt={item.prompt} className="w-full h-full object-cover" loading="lazy" />
            <div className="pointer-events-none absolute inset-0 bg-foreground/0 [@media(hover:hover)]:group-hover:bg-foreground/10 transition-colors duration-fast ease-standard" aria-hidden="true" />
            <div className={cn("absolute bottom-2 right-2 flex items-center gap-1", mediaActionsVisibility)}>
              <MediaAction label="Regenerate" icon={RefreshCw} onClick={onRegenerate} />
              <MediaAction label="Download" icon={Download} onClick={onDownload} />
              <MediaAction label="Delete" icon={Trash2} onClick={onDelete} className="text-destructive hover:text-destructive" />
            </div>
            <div className="absolute top-0 left-0 right-0 p-2 opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity duration-fast ease-standard pointer-events-none">
              <p className="text-caption text-white bg-foreground/25 rounded-xs px-2 py-1 line-clamp-2">{item.prompt}</p>
            </div>
          </>
        ) : (
          <div className={cn("w-full h-full flex flex-col items-center justify-center gap-2 p-3", isGenerating ? "skeleton rounded-none" : "bg-control")}>
            {isGenerating ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="size-5 text-muted-foreground animate-spin" strokeWidth={1.5} aria-hidden="true" />
                <p className="text-caption text-muted-foreground text-center line-clamp-2">{item.prompt}</p>
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center gap-2">
                <XCircle className="size-5 text-destructive" strokeWidth={1.5} aria-hidden="true" />
                <p className="text-caption text-destructive text-center line-clamp-2">{item.error || "Failed"}</p>
                <div className="flex gap-1">
                  <Button type="button" variant="outline" size="xs" onClick={onRegenerate}>Retry</Button>
                  <Button type="button" variant="danger-outline" size="xs" onClick={onDelete}>Remove</Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
