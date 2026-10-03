import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2, Quote } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QuoteGallery } from "@/components/QuoteGallery";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type QuoteMode = "cafe" | "chalk";

interface GeneratedQuote {
  id: string;
  text: string;
  imageUrl: string;
  createdAt: Date;
}

const QuoteGenerator = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [quoteText, setQuoteText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuotes, setGeneratedQuotes] = useState<GeneratedQuote[]>([]);
  const [mode, setMode] = useState<QuoteMode>("cafe");
  const [fillColor, setFillColor] = useState("yellow");
  const [bgColor, setBgColor] = useState("dark navy blue");
  const [selectedModel, setSelectedModel] = useState("pro");
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

  const handleGenerate = async () => {
    if (!quoteText.trim()) { toast.error("Please enter quote text"); return; }
    setIsGenerating(true);
    try {
      const body: Record<string, string> = { quoteText: quoteText.trim(), mode, model: selectedModel };
      if (mode === "chalk") { body.fillColor = fillColor; body.bgColor = bgColor; }
      const { data, error } = await supabase.functions.invoke("generate-quote-image", { body });
      if (error) throw new Error(error.message || "Failed");
      if (data?.error) throw new Error(data.error);
      if (!data?.imageUrl) throw new Error("No image returned");
      setGeneratedQuotes((prev) => [{ id: crypto.randomUUID(), text: quoteText.trim(), imageUrl: data.imageUrl, createdAt: new Date() }, ...prev]);
      toast.success("Quote image generated!");
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
          aria-labelledby="quote-generator-heading"
          className="w-full md:w-tool-panel shrink-0 bg-card rounded-lg p-3 flex flex-col gap-4 md:overflow-y-auto"
        >
          {/* Tool title card */}
          <div className="rounded-[12px] px-3 py-2 bg-cat-audio/10 flex items-center gap-2">
            <Quote className="size-4 text-cat-audio shrink-0" strokeWidth={1.5} aria-hidden="true" />
            <div className="min-w-0">
              <h1 id="quote-generator-heading" className="text-heading-sm text-foreground truncate">Quote generator</h1>
              <p className="text-caption text-muted-foreground truncate">Create stylized quote images</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="quote-style">Style</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as QuoteMode)}>
                <SelectTrigger id="quote-style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cafe">☕ Cafe Photo</SelectItem>
                  <SelectItem value="chalk">🖌️ Chalk Sign</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label id="quote-model-label">Model</Label>
              <div
                role="radiogroup"
                aria-labelledby="quote-model-label"
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

            {mode === "chalk" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="quote-fill">Fill</Label>
                  <Input id="quote-fill" value={fillColor} onChange={(e) => setFillColor(e.target.value)} placeholder="yellow" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="quote-bg">Background</Label>
                  <Input id="quote-bg" value={bgColor} onChange={(e) => setBgColor(e.target.value)} placeholder="dark navy" />
                </div>
              </div>
            )}

            <div className="flex-1 flex flex-col space-y-1.5">
              <Label htmlFor="quote-text">Quote</Label>
              <Textarea
                id="quote-text"
                placeholder="Enter your quote text..."
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                className="flex-1 min-h-[120px] resize-none text-body-md"
              />
            </div>

            {/* Generate — full-width black, sticky on mobile */}
            <div className="sticky bottom-0 md:static bg-card pt-1 -mx-3 px-3 pb-1 md:mx-0 md:px-0 md:pb-0">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleGenerate}
                disabled={isGenerating || !quoteText.trim()}
                aria-busy={isGenerating || undefined}
              >
                {isGenerating ? (
                  <><Loader2 className="animate-spin" strokeWidth={1.5} aria-hidden="true" />Generating...</>
                ) : (
                  <>Generate<Sparkles strokeWidth={1.5} aria-hidden="true" /></>
                )}
              </Button>
            </div>
          </div>
        </section>

        {/* Right — results feed */}
        <div className="flex-1 min-h-[50vh] md:min-h-0 min-w-0 overflow-hidden">
          <QuoteGallery quotes={generatedQuotes} />
        </div>
      </main>
    </AppLayout>
  );
};

export default QuoteGenerator;
