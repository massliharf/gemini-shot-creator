import { PackGenerationStats, formatCost, GEMINI_IMAGE_PRICING } from "@/types/pack";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Image, Zap, TrendingUp } from "lucide-react";

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
    <Card className="p-4 bg-card/50 backdrop-blur border-border/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium">Generation Cost</span>
        </div>
        {isGenerating && (
          <Badge variant="outline" className="text-xs animate-pulse">
            <Zap className="h-3 w-3 mr-1" />
            Live
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Total Cost */}
        <div className="col-span-2 bg-background/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-500">
            {formatCost(stats.cost.totalCost)}
          </div>
          <div className="text-xs text-muted-foreground">Total Cost</div>
        </div>

        {/* Images Generated */}
        <div className="bg-background/30 rounded-lg p-2 text-center">
          <div className="flex items-center justify-center gap-1 text-lg font-semibold">
            <Image className="h-4 w-4 text-blue-500" />
            {stats.imagesGenerated}
          </div>
          <div className="text-xs text-muted-foreground">Images</div>
        </div>

        {/* Per Image Cost */}
        <div className="bg-background/30 rounded-lg p-2 text-center">
          <div className="text-lg font-semibold text-amber-500">
            ${pricePerImage.toFixed(3)}
          </div>
          <div className="text-xs text-muted-foreground">Per Image</div>
        </div>

        {/* Breakdown */}
        <div className="col-span-2 space-y-1 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Input tokens ({stats.promptTokensUsed.toLocaleString()})</span>
            <span>{formatCost(stats.cost.inputCost)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Image output ({stats.imagesGenerated}x)</span>
            <span>{formatCost(stats.cost.imageCost)}</span>
          </div>
        </div>

        {/* Model Info */}
        <div className="col-span-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border/30 pt-2 mt-1">
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {modelInfo.name}
          </span>
          <span>{stats.resolution} resolution</span>
        </div>
      </div>
    </Card>
  );
};

export default CostDisplay;
