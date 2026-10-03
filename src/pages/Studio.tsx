import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, Sparkles, ChevronDown, Check, ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type Tier = "free" | "basic" | "pro" | "ultra";

const MODELS = [
  {
    id: "gemini-3.1-flash-lite-image",
    name: "Flash Lite",
    tokens: 1290,
    imageOut: 0.02,
    supportsResolution: false,
  },
  {
    id: "gemini-3.1-flash-image-preview",
    name: "Flash 3.1",
    tokens: 1290,
    imageOut: 0.039,
    supportsResolution: true,
  },
  {
    id: "gemini-2.5-flash-image",
    name: "Flash 2.5",
    tokens: 1290,
    imageOut: 0.039,
    supportsResolution: false,
  },
  {
    id: "gemini-3-pro-image-preview",
    name: "Pro 3",
    tokens: 1290,
    imageOut: 0.134,
    imageOut4K: 0.24,
    supportsResolution: true,
  },
] as const;

const ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4", "4:5", "3:2", "2:3", "21:9"] as const;
const COUNTS = [1, 2, 4] as const;
const RESOLUTIONS = ["1K", "2K", "4K"] as const;

/* Neutral meta chips for paid tiers; FREE is the upsell → brand pill. */
const TIER_STYLES: Record<Tier, "default" | "brand"> = {
  free: "brand",
  basic: "default",
  pro: "default",
  ultra: "default",
};

export default function Studio() {
  const { setTheme } = useTheme();
  const navigate = useNavigate();

  const [email, setEmail] = useState<string>("");
  const [tier] = useState<Tier>("free");

  const [prompt, setPrompt] = useState("");
  const [modelId, setModelId] = useState<string>(MODELS[0].id);
  const [aspect, setAspect] = useState<string>("1:1");
  const [count, setCount] = useState<number>(1);
  const [resolution, setResolution] = useState<string>("1K");
  const [menuOpen, setMenuOpen] = useState(false);

  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Force dark mode while on this page
  useEffect(() => {
    setTheme("dark");
  }, [setTheme]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate("/auth");
      else setEmail(data.user.email || "");
    });
  }, [navigate]);

  const model = useMemo(
    () => MODELS.find((m) => m.id === modelId) ?? MODELS[0],
    [modelId],
  );

  const estCost = useMemo(() => {
    const per =
      resolution === "4K" && (model as any).imageOut4K
        ? (model as any).imageOut4K
        : model.imageOut;
    return per * count;
  }, [model, count, resolution]);

  const autoGrow = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setImages([]);

    try {
      const jobs = Array.from({ length: count }, () =>
        supabase.functions.invoke("generate-image", {
          body: {
            finalPrompt: prompt.trim(),
            model: modelId,
            aspectRatio: aspect,
            resolution: model.supportsResolution ? resolution : "1K",
            generationMode: "text-only",
          },
        }),
      );

      const results = await Promise.allSettled(jobs);
      const out: string[] = [];
      for (const r of results) {
        if (r.status === "fulfilled") {
          const data: any = r.value.data;
          if (data?.success && data.imageBase64) {
            out.push(`data:${data.mimeType || "image/png"};base64,${data.imageBase64}`);
          }
        }
      }
      if (out.length === 0) {
        toast({
          title: "Görsel üretilemedi",
          description: "Farklı bir prompt veya model deneyin.",
          variant: "destructive",
        });
      }
      setImages(out);
    } catch (e: any) {
      toast({ title: "Hata", description: e?.message || "Bilinmeyen hata", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-svh w-full bg-background text-foreground flex flex-col">
      {/* Top bar */}
      <header className="h-header-mobile md:h-header shrink-0 flex items-center justify-between px-4 md:px-8">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          aria-label="Studio — back to home"
          className="text-foreground"
        >
          <Sparkles strokeWidth={1.5} aria-hidden="true" />
          <span className="hidden sm:inline text-heading-sm">Studio</span>
        </Button>

        <div className="flex items-center gap-3">
          <Badge variant={TIER_STYLES[tier]} className="uppercase text-micro tracking-wide">
            {tier}
          </Badge>

          <button
            type="button"
            onClick={() => supabase.auth.signOut().then(() => navigate("/auth"))}
            className="h-control-md w-control-md rounded-full hover:bg-control transition-colors duration-fast ease-standard flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Account — sign out"
          >
            <div className="size-8 rounded-full bg-active text-foreground text-label-md flex items-center justify-center" aria-hidden="true">
              {email.charAt(0).toUpperCase() || "U"}
            </div>
          </button>
        </div>
      </header>

      {/* Canvas */}
      <main className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 pb-40">
        {images.length === 0 && !loading && (
          <div className="h-full min-h-[50vh] flex items-center justify-center">
            <div className="flex flex-col items-center text-center max-w-md px-4">
              <ImageIcon className="size-6 text-muted-foreground mb-3" strokeWidth={1.5} aria-hidden="true" />
              <h1 className="text-heading-md text-foreground">Henüz görsel yok</h1>
              <p className="text-body-sm text-muted-foreground mt-1">
                Aşağıdaki alandan bir görsel üretmeye başlayın.
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="mx-auto max-w-5xl pt-4 space-y-4" role="status" aria-live="polite" aria-busy="true">
            <div className="flex items-center justify-center gap-2 text-body-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" strokeWidth={1.5} aria-hidden="true" />
              Üretiliyor…
            </div>
            <div
              className={cn(
                "grid gap-3",
                count === 1 && "grid-cols-1",
                count === 2 && "grid-cols-1 sm:grid-cols-2",
                count >= 3 && "grid-cols-2",
              )}
            >
              {Array.from({ length: count }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-md" />
              ))}
            </div>
          </div>
        )}

        {images.length > 0 && (
          <div
            className={cn(
              "mx-auto max-w-5xl grid gap-3 pt-4",
              images.length === 1 && "grid-cols-1",
              images.length === 2 && "grid-cols-1 sm:grid-cols-2",
              images.length >= 3 && "grid-cols-2 sm:grid-cols-2 lg:grid-cols-2",
            )}
          >
            {images.map((src, i) => (
              <div
                key={i}
                className="relative rounded-md overflow-hidden bg-control"
              >
                <img src={src} alt={`Generated ${i + 1}`} className="w-full h-auto block" />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Bottom floating action bar */}
      <div className="fixed bottom-0 inset-x-0 pb-4 md:pb-6 px-4 md:px-6 safe-bottom pointer-events-none">
        <div className="mx-auto max-w-2xl pointer-events-auto">
          <div className="rounded-lg bg-card border border-border shadow-overlay focus-within:border-ring transition-[border-color] duration-fast ease-standard">
            <Label htmlFor="studio-prompt" className="sr-only">Prompt</Label>
            <textarea
              id="studio-prompt"
              ref={textareaRef}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                autoGrow();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              rows={1}
              placeholder="Bir görsel tanımla…"
              className="w-full resize-none bg-transparent focus:outline-none text-body-md text-foreground placeholder:text-tertiary-foreground px-3 pt-3 pb-2 max-h-[200px]"
            />

            <div className="flex items-center justify-between gap-2 px-2 pb-2">
              {/* Model selector button */}
              <Popover open={menuOpen} onOpenChange={setMenuOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="group text-muted-foreground"
                    aria-label={`Generation settings: ${model.name}, ${aspect}, ${count}x`}
                    aria-expanded={menuOpen}
                  >
                    <span className="text-label-md text-foreground">{model.name}</span>
                    <span className="text-tertiary-foreground" aria-hidden="true">·</span>
                    <span>{aspect}</span>
                    <span className="text-tertiary-foreground" aria-hidden="true">·</span>
                    <span>{count}x</span>
                    <ChevronDown className="text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent
                  align="start"
                  side="top"
                  sideOffset={10}
                  className="w-[300px] p-0"
                >
                  <div className="p-2 space-y-4">
                    {/* Model */}
                    <Section title="Model">
                      <div role="radiogroup" aria-label="Model" className="grid grid-cols-1 gap-1">
                        {MODELS.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            role="radio"
                            aria-checked={modelId === m.id}
                            onClick={() => setModelId(m.id)}
                            className={cn(
                              "flex items-center justify-between min-h-touch md:min-h-control-md px-3 rounded-md text-label-md transition-colors duration-fast ease-standard",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              modelId === m.id
                                ? "bg-active text-foreground"
                                : "text-muted-foreground hover:bg-control hover:text-foreground",
                            )}
                          >
                            <span>{m.name}</span>
                            {modelId === m.id && <Check className="size-4" strokeWidth={1.5} aria-hidden="true" />}
                          </button>
                        ))}
                      </div>
                    </Section>

                    {/* Aspect */}
                    <Section title="Aspect ratio">
                      <div className="flex flex-wrap gap-2">
                        {ASPECT_RATIOS.map((a) => (
                          <Chip key={a} active={aspect === a} onClick={() => setAspect(a)}>
                            {a}
                          </Chip>
                        ))}
                      </div>
                    </Section>

                    {/* Count */}
                    <Section title="Görsel sayısı">
                      <div className="flex flex-wrap gap-2">
                        {COUNTS.map((c) => (
                          <Chip key={c} active={count === c} onClick={() => setCount(c)}>
                            {c}x
                          </Chip>
                        ))}
                      </div>
                    </Section>

                    {/* Resolution (only if supported) */}
                    {model.supportsResolution && (
                      <Section title="Çözünürlük">
                        <div className="flex flex-wrap gap-2">
                          {RESOLUTIONS.map((r) => (
                            <Chip key={r} active={resolution === r} onClick={() => setResolution(r)}>
                              {r}
                            </Chip>
                          ))}
                        </div>
                      </Section>
                    )}

                    {/* Cost estimate */}
                    <div className="bg-app rounded-md px-3 h-control-md flex items-center justify-between text-caption">
                      <span className="text-muted-foreground">Tahmini maliyet</span>
                      <span className="text-label-md text-foreground tabular-nums">
                        ${estCost.toFixed(3)}
                      </span>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Generate — single black primary action */}
              <Button
                onClick={handleGenerate}
                disabled={!prompt.trim() || loading}
                size="md"
                className="shrink-0"
              >
                Generate
                {loading ? (
                  <Loader2 className="animate-spin" strokeWidth={1.5} aria-hidden="true" />
                ) : (
                  <Sparkles strokeWidth={1.5} aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-overline text-muted-foreground mb-2 px-1">
        {title}
      </div>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-w-touch md:min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xs",
      )}
    >
      <Badge
        className={cn(
          "cursor-pointer transition-colors duration-fast ease-standard hover:bg-control-hover",
          active && "bg-active ring-1 ring-foreground/80 border-transparent",
        )}
      >
        {children}
      </Badge>
    </button>
  );
}

// TODO(magnific): Studio renders outside AppLayout (no mobile bottom nav), so the floating bar uses
// `fixed bottom-0`. If Studio is later wrapped in AppLayout, switch to `bottom-bottom-nav md:bottom-0`.
// TODO(magnific): Studio forces dark theme via setTheme("dark") in an effect; tokens now follow the theme,
// so removing that effect (logic) would let Studio respect the user's theme preference.
