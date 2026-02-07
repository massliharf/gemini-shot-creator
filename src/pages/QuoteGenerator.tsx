import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { QuoteGallery } from "@/components/QuoteGallery";
import { toast } from "sonner";

interface GeneratedQuote {
  id: string;
  text: string;
  imageUrl: string;
  createdAt: Date;
}

const BASE_PROMPT = `A black and white grainy photograph with a blurry, indistinct scene of random people in a cafe as the subject and background. Large, yellow, hand-drawn brushstroke text overlays the center, reading "QUOTE_TEXT". 9:16 aspect ratio.`;

const QuoteGenerator = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [quoteText, setQuoteText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuotes, setGeneratedQuotes] = useState<GeneratedQuote[]>([]);
  const navigate = useNavigate();

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session) {
        navigate("/auth");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleGenerate = async () => {
    if (!quoteText.trim()) {
      toast.error("Please enter quote text");
      return;
    }

    setIsGenerating(true);

    try {
      const prompt = BASE_PROMPT.replace("QUOTE_TEXT", quoteText.trim());

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_LOVABLE_API_KEY || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate image");
      }

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!imageUrl) {
        throw new Error("No image returned from API");
      }

      const newQuote: GeneratedQuote = {
        id: crypto.randomUUID(),
        text: quoteText.trim(),
        imageUrl,
        createdAt: new Date(),
      };

      setGeneratedQuotes((prev) => [newQuote, ...prev]);
      toast.success("Quote image generated!");
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("Failed to generate image");
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

  if (!user) {
    return null;
  }

  return (
    <AppLayout userEmail={user.email}>
      <main className="flex-1 overflow-hidden flex min-w-0 bg-background">
        {/* Left Panel - Input */}
        <div className="w-80 flex-shrink-0 border-r border-border p-4 flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Quote Generator</h2>
            <p className="text-sm text-muted-foreground">
              Enter your quote text to generate a stylized image
            </p>
          </div>

          <div className="flex-1 flex flex-col gap-3">
            <Textarea
              placeholder="Enter your quote text here..."
              value={quoteText}
              onChange={(e) => setQuoteText(e.target.value)}
              className="flex-1 min-h-[200px] resize-none"
            />

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !quoteText.trim()}
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
        </div>

        {/* Right Panel - Gallery */}
        <div className="flex-1 overflow-hidden">
          <QuoteGallery quotes={generatedQuotes} />
        </div>
      </main>
    </AppLayout>
  );
};

export default QuoteGenerator;
