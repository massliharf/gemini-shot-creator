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
    <div className="flex flex-col gap-2">
      {/* Header Row - Navigation + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onPrevPack}
            disabled={totalPacks <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[40px] text-center">
            {totalPacks > 0 ? `${currentIndex + 1}/${totalPacks}` : "—"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onNextPack}
            disabled={totalPacks <= 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        
        <span className="text-sm font-medium text-foreground truncate flex-1 mx-2">
          {packName}
        </span>

        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={handleCopyDescription}
            disabled={!description}
            title="Copy"
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={onDownload}
            disabled={!pack}
            title="Download"
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
          <Button
            onClick={onGenerate}
            disabled={!canGenerate || isGenerating}
            size="sm"
            className="h-7 px-3 text-xs gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isGenerating ? "..." : "Create"}
          </Button>
        </div>
      </div>

      {/* Description - compact */}
      {description && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {description}
        </p>
      )}
    </div>
  );
};
