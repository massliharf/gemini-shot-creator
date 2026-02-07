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
      const { data, error } = await supabase.functions.invoke("generate-quote-image", {
        body: { quoteText: quoteText.trim() },
      });

      if (error) {
        console.error("Function error:", error);
        throw new Error(error.message || "Failed to generate image");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.imageUrl) {
        throw new Error("No image returned");
      }

      const newQuote: GeneratedQuote = {
        id: crypto.randomUUID(),
        text: quoteText.trim(),
        imageUrl: data.imageUrl,
        createdAt: new Date(),
      };

      setGeneratedQuotes((prev) => [newQuote, ...prev]);
      toast.success("Quote image generated!");
    } catch (error) {
      console.error("Generation error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate image");
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
