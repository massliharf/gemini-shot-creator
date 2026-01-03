import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, ChevronUp, Upload, X, Copy } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SettingsPanelProps {
  aspectRatio: string;
  onAspectRatioChange: (ratio: string) => void;
  onImageUpload: (file: File) => void;
  onImageClear: () => void;
  coupleMode: boolean;
  onCoupleModeChange: (enabled: boolean) => void;
  onSecondImageUpload: (file: File) => void;
  onSecondImageClear: () => void;
  previewUrl?: string | null;
  secondPreviewUrl?: string | null;
  selectedModel: string;
  onModelChange: (model: string) => void;
  imageSize: string;
  onImageSizeChange: (size: string) => void;
}

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1" },
  { value: "9:16", label: "9:16" },
  { value: "16:9", label: "16:9" },
  { value: "3:4", label: "3:4" },
  { value: "4:3", label: "4:3" },
  { value: "3:2", label: "3:2" },
  { value: "2:3", label: "2:3" },
  { value: "5:4", label: "5:4" },
  { value: "4:5", label: "4:5" },
  { value: "21:9", label: "21:9" },
];

export const SettingsPanel = ({
  aspectRatio,
  onAspectRatioChange,
  onImageUpload,
  onImageClear,
  coupleMode,
  onCoupleModeChange,
  onSecondImageUpload,
  onSecondImageClear,
  previewUrl,
  secondPreviewUrl,
  selectedModel,
  onModelChange,
  imageSize,
  onImageSizeChange,
}: SettingsPanelProps) => {
  const [isOpen, setIsOpen] = useState(true);

  const ImageUploadBox = ({
    preview,
    onUpload,
    onClear,
    label,
  }: {
    preview?: string | null;
    onUpload: (file: File) => void;
    onClear: () => void;
    label: string;
  }) => (
    <div className="relative">
      <Label className="text-xs text-muted-foreground mb-1.5 block">{label}</Label>
      {preview ? (
        <div className="relative w-16 h-16 rounded-lg overflow-hidden group">
          <img src={preview} alt="Reference" className="w-full h-full object-cover" />
          <button
            onClick={onClear}
            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      ) : (
        <label className="w-16 h-16 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center cursor-pointer transition-colors bg-secondary/30">
          <Upload className="w-5 h-5 text-muted-foreground" />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
            }}
          />
        </label>
      )}
    </div>
  );

  return (
    <div className="panel-card">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-0 h-auto hover:bg-transparent"
          >
            <span className="text-sm font-medium text-primary">Settings</span>
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="pt-4 space-y-4">
          {/* Reference Images */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs text-muted-foreground">Reference</Label>
              <div className="flex items-center gap-2">
                <Label htmlFor="couple-mode" className="text-xs text-muted-foreground">
                  Couple
                </Label>
                <Switch
                  id="couple-mode"
                  checked={coupleMode}
                  onCheckedChange={onCoupleModeChange}
                  className="scale-90"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <ImageUploadBox
                preview={previewUrl}
                onUpload={onImageUpload}
                onClear={onImageClear}
                label={coupleMode ? "Person 1" : "Face"}
              />
              {coupleMode && (
                <ImageUploadBox
                  preview={secondPreviewUrl}
                  onUpload={onSecondImageUpload}
                  onClear={onSecondImageClear}
                  label="Person 2"
                />
              )}
            </div>
          </div>

          {/* Model & Aspect Ratio */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Model</Label>
              <Select value={selectedModel} onValueChange={onModelChange}>
                <SelectTrigger className="h-9 bg-secondary border-0">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent className="z-[100] bg-popover border-border">
                  <SelectItem value="gemini-2.5-flash-image">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      Gemini 2.5 Flash Image
                    </div>
                  </SelectItem>
                  <SelectItem value="gemini-3-pro-image-preview">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      Gemini 3 Pro Image
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Image Size - only for Gemini 3 */}
            {selectedModel === "gemini-3-pro-image-preview" && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Quality</Label>
                <Select value={imageSize} onValueChange={onImageSizeChange}>
                  <SelectTrigger className="h-9 bg-secondary border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[100] bg-popover border-border">
                    <SelectItem value="1K">1K</SelectItem>
                    <SelectItem value="2K">2K</SelectItem>
                    <SelectItem value="4K">4K</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Aspect ratio</Label>
              <Select value={aspectRatio} onValueChange={onAspectRatioChange}>
                <SelectTrigger className="h-9 bg-secondary border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100] bg-popover border-border">
                  {ASPECT_RATIOS.map((ratio) => (
                    <SelectItem key={ratio.value} value={ratio.value}>
                      {ratio.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Powered by */}
          <p className="text-xs text-muted-foreground/60 flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-primary/20" />
            Powered by Gemini
          </p>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};