import { useState } from "react";
import { Download, Expand, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
      <div className="h-full flex items-center justify-center px-4 md:px-8">
        <div className="text-center flex flex-col items-center gap-3 max-w-xs">
          <ImageIcon className="size-6 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-heading-md text-foreground">No images yet</p>
            <p className="text-body-sm text-muted-foreground">
              Fill in the form and press Generate — your results will appear here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-full">
        <div className="px-2 md:px-4 py-2 md:py-4">
          {/* Result group — tonal block on the #FAFAFA surface */}
          <section className="bg-app rounded-lg p-4" aria-label="Generated images">
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-label-md text-foreground truncate">Generated images</p>
              <span className="text-caption text-muted-foreground shrink-0">{quotes.length}</span>
            </div>
            <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 list-none m-0 p-0">
              {quotes.map((quote) => (
                <li
                  key={quote.id}
                  className="group relative bg-control rounded-md overflow-hidden cursor-pointer aspect-[9/16] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-app"
                  onClick={() => setSelectedQuote(quote)}
                >
                  <img src={quote.imageUrl} alt={quote.text} className="w-full h-full object-cover" />
                  {/* Caption + actions overlay (always visible on touch, hover-revealed on desktop) */}
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity duration-fast ease-standard">
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-white text-caption line-clamp-2">{quote.text}</p>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="View full size"
                        className="bg-card/90 text-foreground hover:bg-card"
                        onClick={(e) => { e.stopPropagation(); setSelectedQuote(quote); }}
                      >
                        <Expand strokeWidth={1.5} aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Download image"
                        className="bg-card/90 text-foreground hover:bg-card"
                        onClick={(e) => { e.stopPropagation(); handleDownload(quote); }}
                      >
                        <Download strokeWidth={1.5} aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </ScrollArea>

      <Dialog open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
        <DialogContent className="max-w-3xl p-0 bg-foreground/90 border-none [&>button:last-of-type]:hidden">
          <DialogTitle className="sr-only">{selectedQuote?.text || "Generated image"}</DialogTitle>
          <button
            type="button"
            aria-label="Close"
            className="absolute top-3 right-3 z-50 size-10 rounded-md bg-background/10 hover:bg-background/20 text-white flex items-center justify-center transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setSelectedQuote(null)}
          >
            <X className="size-5" strokeWidth={1.5} aria-hidden="true" />
          </button>
          {selectedQuote && (
            <div className="flex flex-col items-center justify-center p-4 md:p-6">
              <img src={selectedQuote.imageUrl} alt={selectedQuote.text} className="max-h-[80vh] object-contain rounded-lg" />
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => handleDownload(selectedQuote)}
                >
                  <Download strokeWidth={1.5} aria-hidden="true" />
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
