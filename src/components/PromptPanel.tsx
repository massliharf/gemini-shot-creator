import { Button } from "@/components/ui/button";
import { Sparkles, Copy, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { PackFile, getPackName, getPackDescription } from "@/types/pack";
import { toast } from "sonner";

interface PromptPanelProps {
  pack: PackFile | null;
  currentIndex: number;
  totalPacks: number;
  onPrevPack: () => void;
  onNextPack: () => void;
  onGenerate: () => void;
  onDownload?: () => void;
  isGenerating: boolean;
  canGenerate: boolean;
}

export const PromptPanel = ({
  pack,
  currentIndex,
  totalPacks,
  onPrevPack,
  onNextPack,
  onGenerate,
  onDownload,
  isGenerating,
  canGenerate,
}: PromptPanelProps) => {
  // New nested schema: meta.description and meta.pack_name
  const description = pack ? getPackDescription(pack) : "";
  const packName = pack ? getPackName(pack) : "No pack";

  const handleCopyDescription = () => {
    if (description) {
      navigator.clipboard.writeText(description);
      toast.success("Copied");
    }
  };

  return (
    <section className="flex flex-col gap-2" aria-label="Current pack">
      {/* Header Row - Navigation + Actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1" role="group" aria-label="Pack navigation">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onPrevPack}
            disabled={totalPacks <= 1}
            aria-label="Previous pack"
          >
            <ChevronLeft strokeWidth={1.5} aria-hidden="true" />
          </Button>
          <span className="text-caption text-muted-foreground min-w-[40px] text-center tabular-nums" aria-live="polite">
            {totalPacks > 0 ? `${currentIndex + 1}/${totalPacks}` : "—"}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onNextPack}
            disabled={totalPacks <= 1}
            aria-label="Next pack"
          >
            <ChevronRight strokeWidth={1.5} aria-hidden="true" />
          </Button>
        </div>

        <h3 className="text-heading-sm text-foreground truncate flex-1 min-w-0 mx-1">
          {packName}
        </h3>

        <div className="flex items-center gap-1" role="group" aria-label="Pack actions">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleCopyDescription}
            disabled={!description}
            title="Copy"
            aria-label="Copy description"
          >
            <Copy strokeWidth={1.5} aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onDownload}
            disabled={!pack}
            title="Download"
            aria-label="Download pack"
          >
            <Download strokeWidth={1.5} aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onGenerate}
            disabled={!canGenerate || isGenerating}
            size="md"
            aria-busy={isGenerating || undefined}
          >
            {isGenerating ? "..." : "Create"}
            <Sparkles strokeWidth={1.5} aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Description - compact */}
      {description && (
        <p className="text-body-sm text-muted-foreground line-clamp-2">
          {description}
        </p>
      )}
    </section>
  );
};
