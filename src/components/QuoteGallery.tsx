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
      // Convert base64 to blob
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
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
            <span className="text-3xl">💬</span>
          </div>
          <h3 className="text-lg font-medium text-foreground/80 mb-2">No quotes yet</h3>
          <p className="text-sm text-muted-foreground">
            Enter text and click Generate to create quote images
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-full">
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {quotes.map((quote) => (
              <div
                key={quote.id}
                className="group relative bg-secondary rounded-xl overflow-hidden cursor-pointer aspect-[9/16]"
                onClick={() => setSelectedQuote(quote)}
              >
                <img
                  src={quote.imageUrl}
                  alt={quote.text}
                  className="w-full h-full object-cover"
                />

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {/* Quote text preview */}
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-white text-xs line-clamp-2">{quote.text}</p>
                  </div>

                  {/* Actions */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 bg-black/50 hover:bg-black/70 text-white rounded-lg backdrop-blur-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedQuote(quote);
                      }}
                    >
                      <Expand className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 bg-black/50 hover:bg-black/70 text-white rounded-lg backdrop-blur-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(quote);
                      }}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* Fullscreen view */}
      <Dialog open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-4 right-4 z-50 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white"
            onClick={() => setSelectedQuote(null)}
          >
            <X className="w-5 h-5" />
          </Button>

          {selectedQuote && (
            <div className="flex flex-col items-center justify-center p-8">
              <img
                src={selectedQuote.imageUrl}
                alt={selectedQuote.text}
                className="max-h-[80vh] object-contain rounded-lg"
              />
              
              <div className="mt-4 flex gap-2">
                <Button
                  variant="secondary"
                  className="gap-2"
                  onClick={() => handleDownload(selectedQuote)}
                >
                  <Download className="w-4 h-4" />
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
