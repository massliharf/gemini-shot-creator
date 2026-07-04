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
import { ArrowUp, Loader2, Sparkles, ChevronDown, Check } from "lucide-react";
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

const TIER_STYLES: Record<Tier, string> = {
  free: "border-white/20 text-white/70 bg-white/5",
  basic: "border-sky-400/40 text-sky-300 bg-sky-500/10",
  pro: "border-violet-400/40 text-violet-300 bg-violet-500/10",
  ultra: "border-amber-400/50 text-amber-300 bg-amber-500/10",
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
    <div
      className="min-h-svh w-full bg-[#0a0a0a] text-white flex flex-col"
      style={{ fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif" }}
    >
      {/* Top Bar */}
      <header className="h-14 shrink-0 flex items-center justify-between px-4 sm:px-6">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-[13px] font-medium text-white/60 hover:text-white transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">Studio</span>
        </button>

        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "h-7 px-2.5 rounded-full border text-[11px] font-medium uppercase tracking-wide flex items-center",
              TIER_STYLES[tier],
            )}
          >
            {tier}
          </span>

          {/* 40px frame with 2px stroke around 32px avatar */}
          <button
            onClick={() => supabase.auth.signOut().then(() => navigate("/auth"))}
            className="h-10 w-10 rounded-full border-2 border-white/20 hover:border-white/40 transition-colors flex items-center justify-center"
            aria-label="Account"
          >
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-neutral-200 to-neutral-500 text-neutral-900 text-[13px] font-semibold flex items-center justify-center">
              {email.charAt(0).toUpperCase() || "U"}
            </div>
          </button>
        </div>
      </header>

      {/* Canvas */}
      <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pb-40">
        {images.length === 0 && !loading && (
          <div className="h-full min-h-[50vh] flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="text-[15px] text-white/40">
                Aşağıdaki alandan bir görsel üretmeye başlayın.
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="h-full min-h-[50vh] flex items-center justify-center">
            <div className="flex items-center gap-3 text-white/60 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Üretiliyor…
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
                className="relative rounded-xl overflow-hidden bg-neutral-900 border border-white/5"
              >
                <img src={src} alt={`Generated ${i + 1}`} className="w-full h-auto block" />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Bottom Input Bar */}
      <div className="fixed bottom-0 inset-x-0 pb-4 sm:pb-6 px-3 sm:px-6 pointer-events-none">
        <div className="mx-auto max-w-2xl pointer-events-auto">
          <div className="rounded-2xl bg-neutral-900/90 backdrop-blur-xl border border-white/10 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)]">
            <textarea
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
              className="w-full resize-none bg-transparent outline-none text-[14px] leading-6 text-white placeholder:text-white/30 px-4 pt-3.5 pb-2 max-h-[200px]"
            />

            <div className="flex items-center justify-between px-2 pb-2">
              {/* Model selector button */}
              <Popover open={menuOpen} onOpenChange={setMenuOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="group flex items-center gap-1.5 h-8 px-2.5 rounded-lg hover:bg-white/5 text-[11.5px] text-white/70 hover:text-white transition-colors"
                  >
                    <span className="font-medium text-white/90">{model.name}</span>
                    <span className="text-white/40">·</span>
                    <span>{aspect}</span>
                    <span className="text-white/40">·</span>
                    <span>{count}x</span>
                    <ChevronDown className="w-3 h-3 text-white/40 group-hover:text-white/70" />
                  </button>
                </PopoverTrigger>

                <PopoverContent
                  align="start"
                  side="top"
                  sideOffset={10}
                  className="w-[300px] p-0 rounded-xl border-white/10 bg-neutral-950/95 backdrop-blur-xl text-white shadow-2xl"
                >
                  <div className="p-3 space-y-3">
                    {/* Model */}
                    <Section title="Model">
                      <div className="grid grid-cols-1 gap-0.5">
                        {MODELS.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => setModelId(m.id)}
                            className={cn(
                              "flex items-center justify-between h-7 px-2 rounded-md text-[11.5px] transition-colors",
                              modelId === m.id
                                ? "bg-white/10 text-white"
                                : "text-white/60 hover:bg-white/5 hover:text-white",
                            )}
                          >
                            <span>{m.name}</span>
                            {modelId === m.id && <Check className="w-3 h-3" />}
                          </button>
                        ))}
                      </div>
                    </Section>

                    {/* Aspect */}
                    <Section title="Aspect ratio">
                      <div className="flex flex-wrap gap-1">
                        {ASPECT_RATIOS.map((a) => (
                          <Chip key={a} active={aspect === a} onClick={() => setAspect(a)}>
                            {a}
                          </Chip>
                        ))}
                      </div>
                    </Section>

                    {/* Count */}
                    <Section title="Görsel sayısı">
                      <div className="flex gap-1">
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
                        <div className="flex gap-1">
                          {RESOLUTIONS.map((r) => (
                            <Chip key={r} active={resolution === r} onClick={() => setResolution(r)}>
                              {r}
                            </Chip>
                          ))}
                        </div>
                      </Section>
                    )}

                    {/* Cost estimate */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                      <span className="text-white/40">Tahmini maliyet</span>
                      <span className="text-white/80 font-medium tabular-nums">
                        ${estCost.toFixed(3)}
                      </span>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Send */}
              <Button
                onClick={handleGenerate}
                disabled={!prompt.trim() || loading}
                size="icon"
                className="h-8 w-8 rounded-lg bg-white text-neutral-900 hover:bg-white/90 disabled:opacity-40"
                aria-label="Generate"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowUp className="w-4 h-4" />
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
      <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5 px-0.5">
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
      onClick={onClick}
      className={cn(
        "h-6 px-2 rounded-md text-[11px] transition-colors border",
        active
          ? "bg-white text-neutral-900 border-white"
          : "bg-transparent text-white/60 border-white/10 hover:border-white/30 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}
