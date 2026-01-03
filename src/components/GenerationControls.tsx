import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Download, Play } from "lucide-react";

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
    <Card className="bg-card border-border">
      <div className="p-2">
        <div className="flex items-center gap-2">
          <Button
            onClick={onGenerateAll}
            disabled={!canGenerate || isGenerating}
            size="sm"
            className="flex-1 h-7 text-xs font-medium bg-foreground text-background hover:bg-foreground/90"
          >
            {isGenerating ? (
              <>
                <Sparkles className="w-3 h-3 mr-1 animate-pulse" />
                {progress}/{totalShots}
              </>
            ) : (
              <>
                <Play className="w-3 h-3 mr-1" />
                Generate All
              </>
            )}
          </Button>

          {hasGeneratedImages && (
            <Button
              onClick={onDownloadAll}
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2"
            >
              <Download className="w-3 h-3 mr-1" />
              ZIP
            </Button>
          )}
        </div>

        {isGenerating && (
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-muted-foreground">Progress</span>
              <span>{Math.round((progress / totalShots) * 100)}%</span>
            </div>
            <Progress value={(progress / totalShots) * 100} className="h-1" />
          </div>
        )}
      </div>
    </Card>
  );
};
