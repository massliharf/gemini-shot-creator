import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Send, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
        <div className="w-72 flex-shrink-0 border-r border-border/50 p-4 flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold mb-0.5">Quote Generator</h2>
            <p className="text-xs text-muted-foreground">Create stylized quote images</p>
          </div>

          <div className="flex-1 flex flex-col gap-3">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Style</label>
              <Select value={mode} onValueChange={(v) => setMode(v as QuoteMode)}>
                <SelectTrigger className="w-full h-9 rounded-lg border-border/50 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cafe">☕ Cafe Photo</SelectItem>
                  <SelectItem value="chalk">🖌️ Chalk Sign</SelectItem>
                </SelectContent>
              </Select>
            </div>

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

            {mode === "chalk" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Fill</label>
                  <Input value={fillColor} onChange={(e) => setFillColor(e.target.value)} placeholder="yellow" className="h-8 text-xs rounded-lg border-border/50" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground mb-1 block">BG</label>
                  <Input value={bgColor} onChange={(e) => setBgColor(e.target.value)} placeholder="dark navy" className="h-8 text-xs rounded-lg border-border/50" />
                </div>
              </div>
            )}

            <Textarea
              placeholder="Enter your quote text..."
              value={quoteText}
              onChange={(e) => setQuoteText(e.target.value)}
              className="flex-1 min-h-[120px] resize-none text-sm rounded-xl border-border/50"
            />

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !quoteText.trim()}
              className="w-full h-9 rounded-lg bg-foreground text-background hover:bg-foreground/90 text-xs font-semibold gap-2"
            >
              {isGenerating ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generating...</>
              ) : (
                <><Send className="w-3.5 h-3.5" />Generate</>
              )}
            </Button>
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 overflow-hidden">
          <QuoteGallery quotes={generatedQuotes} />
        </div>
      </main>
    </AppLayout>
  );
};

export default QuoteGenerator;
