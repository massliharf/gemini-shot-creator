import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Sparkles, Loader2 } from "lucide-react";

interface GenerationControlsProps {
  canGenerate: boolean;
  isGenerating: boolean;
  progress: number;
  totalShots: number;
  onGenerateAll: () => void;
  onDownloadAll: () => void;
  hasGeneratedImages: boolean;
}

export const GenerationControls = ({
  canGenerate,
  isGenerating,
  progress,
  totalShots,
  onGenerateAll,
  onDownloadAll,
  hasGeneratedImages,
}: GenerationControlsProps) => {
  return (
    <div className="bg-card text-card-foreground rounded-lg p-4">
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          onClick={onGenerateAll}
          disabled={!canGenerate || isGenerating}
          size="lg"
          className="flex-1 md:h-control-md md:text-label-md"
          aria-busy={isGenerating || undefined}
        >
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin" strokeWidth={1.5} aria-hidden="true" />
              <span className="tabular-nums">{progress}/{totalShots}</span>
            </>
          ) : (
            <>
              Generate all
              <Sparkles strokeWidth={1.5} aria-hidden="true" />
            </>
          )}
        </Button>

        {hasGeneratedImages && (
          <Button
            onClick={onDownloadAll}
            variant="outline"
            size="lg"
            className="md:h-control-md md:text-label-md"
          >
            <Download strokeWidth={1.5} aria-hidden="true" />
            ZIP
          </Button>
        )}
      </div>

      {isGenerating && (
        <div className="mt-4 space-y-2" role="status" aria-live="polite">
          <div className="flex justify-between items-center">
            <span className="text-overline text-muted-foreground">Progress</span>
            <span className="text-caption text-foreground tabular-nums">{Math.round((progress / totalShots) * 100)}%</span>
          </div>
          <Progress value={(progress / totalShots) * 100} className="h-1" aria-label="Generation progress" />
        </div>
      )}
    </div>
  );
};
