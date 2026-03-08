import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  aspectRatio: string;
  onAspectRatioChange: (ratio: string) => void;
  resolution: string;
  onResolutionChange: (resolution: string) => void;
}

const MODELS = [
  { value: "gemini-2.5-flash-image", label: "Gemini 2.5 Flash Image" },
  { value: "gemini-3.1-flash-image-preview", label: "Gemini 3.1 Flash Image" },
  { value: "gemini-3-pro-image-preview", label: "Gemini 3 Pro Image" },
];

// Size tables (kept in sync with backend)
const FLASH_SIZES: Record<string, string> = {
  "1:1": "1024x1024",
  "2:3": "832x1248",
  "3:2": "1248x832",
  "3:4": "864x1184",
  "4:3": "1184x864",
  "4:5": "896x1152",
  "5:4": "1152x896",
  "9:16": "768x1344",
  "16:9": "1344x768",
  "21:9": "1536x672",
};

const PRO_SIZES: Record<string, Record<string, string>> = {
  "1:1": { "1K": "1024x1024", "2K": "2048x2048", "4K": "4096x4096" },
  "2:3": { "1K": "848x1264", "2K": "1696x2528", "4K": "3392x5056" },
  "3:2": { "1K": "1264x848", "2K": "2528x1696", "4K": "5056x3392" },
  "3:4": { "1K": "896x1200", "2K": "1792x2400", "4K": "3584x4800" },
  "4:3": { "1K": "1200x896", "2K": "2400x1792", "4K": "4800x3584" },
  "4:5": { "1K": "928x1152", "2K": "1856x2304", "4K": "3712x4608" },
  "5:4": { "1K": "1152x928", "2K": "2304x1856", "4K": "4608x3712" },
  "9:16": { "1K": "768x1376", "2K": "1536x2752", "4K": "3072x5504" },
  "16:9": { "1K": "1376x768", "2K": "2752x1536", "4K": "5504x3072" },
  "21:9": { "1K": "1584x672", "2K": "3168x1344", "4K": "6336x2688" },
};

const formatSize = (size: string) => size.replace("x", "×");

// Aspect ratios supported by both models
const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1 (Square)" },
  { value: "2:3", label: "2:3 (Portrait)" },
  { value: "3:2", label: "3:2 (Landscape)" },
  { value: "3:4", label: "3:4 (Portrait)" },
  { value: "4:3", label: "4:3 (Landscape)" },
  { value: "4:5", label: "4:5 (Portrait)" },
  { value: "5:4", label: "5:4 (Landscape)" },
  { value: "9:16", label: "9:16 (Story)" },
  { value: "16:9", label: "16:9 (Wide)" },
  { value: "21:9", label: "21:9 (Ultrawide)" },
];

// Resolutions for Gemini 3 Pro (1K, 2K, 4K)
const RESOLUTIONS = [
  { value: "1K", label: "1K" },
  { value: "2K", label: "2K" },
  { value: "4K", label: "4K" },
];

export const ModelSelector = ({
  selectedModel,
  onModelChange,
  aspectRatio,
  onAspectRatioChange,
  resolution,
  onResolutionChange,
}: ModelSelectorProps) => {
  const isGemini3Pro = selectedModel === "gemini-3-pro-image-preview" || selectedModel === "gemini-3.1-flash-image-preview";

  return (
    <div className="space-y-3">
      {/* Model Select */}
      <div>
        <Label className="text-[10px] text-muted-foreground mb-1 block">Model</Label>
        <Select value={selectedModel} onValueChange={onModelChange}>
          <SelectTrigger className="h-8 text-[11px]">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent className="z-[100] bg-popover border-border">
            {MODELS.map((model) => (
              <SelectItem key={model.value} value={model.value} className="text-[11px]">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span>{model.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Aspect Ratio Select */}
      <div>
        <Label className="text-[10px] text-muted-foreground mb-1 block">Aspect Ratio</Label>
        <Select value={aspectRatio} onValueChange={onAspectRatioChange}>
          <SelectTrigger className="h-8 text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[100] bg-popover border-border">
            {ASPECT_RATIOS.map((ratio) => {
              const size = isGemini3Pro
                ? (PRO_SIZES[ratio.value]?.[resolution] ?? PRO_SIZES["1:1"]["1K"])
                : (FLASH_SIZES[ratio.value] ?? FLASH_SIZES["1:1"]);

              return (
                <SelectItem key={ratio.value} value={ratio.value} className="text-[11px]">
                  <div className="flex items-center justify-between gap-3">
                    <span>{ratio.label}</span>
                    <span className="text-muted-foreground">{formatSize(size)}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Resolution Select - only for Gemini 3 Pro */}
      {isGemini3Pro && (
        <div>
          <Label className="text-[10px] text-muted-foreground mb-1 block">Resolution</Label>
          <Select value={resolution} onValueChange={onResolutionChange}>
            <SelectTrigger className="h-8 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[100] bg-popover border-border">
              {RESOLUTIONS.map((res) => (
                <SelectItem key={res.value} value={res.value} className="text-[11px]">
                  {res.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};
