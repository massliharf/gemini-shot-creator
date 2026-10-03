import { PackGenerationStats, formatCost, GEMINI_IMAGE_PRICING } from "@/types/pack";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";

interface CostDisplayProps {
  stats: PackGenerationStats | null;
  isGenerating?: boolean;
}

export const CostDisplay = ({ stats, isGenerating }: CostDisplayProps) => {
  if (!stats) return null;

  const modelInfo = GEMINI_IMAGE_PRICING[stats.model];
  const pricePerImage = stats.model === "gemini-3-pro-image-preview"
    ? stats.resolution === "4K"
      ? GEMINI_IMAGE_PRICING["gemini-3-pro-image-preview"].outputPerImage4K
      : GEMINI_IMAGE_PRICING["gemini-3-pro-image-preview"].outputPerImage1K2K
    : GEMINI_IMAGE_PRICING["gemini-2.5-flash-image"].outputPerImage;

  return (
    <Card className="p-4 md:p-7">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-heading-sm">Generation cost</h3>
        {isGenerating && (
          <Badge variant="info">
            <Zap strokeWidth={1.5} aria-hidden="true" />
            Live
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Total Cost */}
        <div className="col-span-2 bg-app rounded-[12px] p-4">
          <p className="text-overline text-muted-foreground mb-1">Total cost</p>
          <p className="text-heading-md text-foreground tabular-nums">
            {formatCost(stats.cost.totalCost)}
          </p>
        </div>

        {/* Images Generated */}
        <div className="bg-app rounded-[12px] p-4">
          <p className="text-overline text-muted-foreground mb-1">Images</p>
          <p className="text-heading-md text-foreground tabular-nums">{stats.imagesGenerated}</p>
        </div>

        {/* Per Image Cost */}
        <div className="bg-app rounded-[12px] p-4">
          <p className="text-overline text-muted-foreground mb-1">Per image</p>
          <p className="text-heading-md text-foreground tabular-nums">
            ${pricePerImage.toFixed(3)}
          </p>
        </div>

        {/* Breakdown */}
        <div className="col-span-2 space-y-1 text-body-sm pt-1">
          <div className="flex justify-between gap-3 text-muted-foreground">
            <span>Input tokens ({stats.promptTokensUsed.toLocaleString()})</span>
            <span className="tabular-nums text-foreground">{formatCost(stats.cost.inputCost)}</span>
          </div>
          <div className="flex justify-between gap-3 text-muted-foreground">
            <span>Image output ({stats.imagesGenerated}x)</span>
            <span className="tabular-nums text-foreground">{formatCost(stats.cost.imageCost)}</span>
          </div>
        </div>

        {/* Model Info */}
        <div className="col-span-2 flex flex-wrap items-center gap-1.5 pt-1">
          <Badge>{modelInfo.name}</Badge>
          <Badge>{stats.resolution}</Badge>
        </div>
      </div>
    </Card>
  );
};

export default CostDisplay;
