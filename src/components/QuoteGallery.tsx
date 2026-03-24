import { useState } from "react";
import { Download, Expand, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GeneratedQuote {
  id: string;
  text: string;
  imageUrl: string;
  createdAt: Date;
}

interface QuoteGalleryProps {
  quotes: GeneratedQuote[];
}

export const QuoteGallery = ({ quotes }: QuoteGalleryProps) => {
  const [selectedQuote, setSelectedQuote] = useState<GeneratedQuote | null>(null);

  const handleDownload = async (quote: GeneratedQuote) => {
    try {
      const response = await fetch(quote.imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quote-${quote.id.slice(0, 8)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  if (quotes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-accent flex items-center justify-center">
            <span className="text-xl">💬</span>
          </div>
          <p className="text-sm text-muted-foreground">No images yet</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-full">
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {quotes.map((quote) => (
              <div
                key={quote.id}
                className="group relative bg-accent rounded-lg overflow-hidden cursor-pointer aspect-[9/16]"
                onClick={() => setSelectedQuote(quote)}
              >
                <img src={quote.imageUrl} alt={quote.text} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-white text-[10px] line-clamp-2">{quote.text}</p>
                  </div>
                  <div className="absolute top-1.5 right-1.5 flex gap-1">
                    <button
                      className="h-6 w-6 rounded-md bg-black/40 backdrop-blur-sm hover:bg-black/60 flex items-center justify-center text-white"
                      onClick={(e) => { e.stopPropagation(); setSelectedQuote(quote); }}
                    >
                      <Expand className="w-3 h-3" />
                    </button>
                    <button
                      className="h-6 w-6 rounded-md bg-black/40 backdrop-blur-sm hover:bg-black/60 flex items-center justify-center text-white"
                      onClick={(e) => { e.stopPropagation(); handleDownload(quote); }}
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>

      <Dialog open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
        <DialogContent className="max-w-3xl p-0 bg-black/95 border-none rounded-2xl">
          <button
            className="absolute top-3 right-3 z-50 h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
            onClick={() => setSelectedQuote(null)}
          >
            <X className="w-4 h-4" />
          </button>
          {selectedQuote && (
            <div className="flex flex-col items-center justify-center p-6">
              <img src={selectedQuote.imageUrl} alt={selectedQuote.text} className="max-h-[80vh] object-contain rounded-lg" />
              <div className="mt-3">
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-1.5 rounded-lg text-xs"
                  onClick={() => handleDownload(selectedQuote)}
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
