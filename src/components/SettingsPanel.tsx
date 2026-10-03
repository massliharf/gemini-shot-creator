import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, ChevronUp, Upload, X, Copy, Sparkles } from "lucide-react";
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
    <div className="relative space-y-2">
      <Label className="block">{label}</Label>
      {preview ? (
        <div className="relative size-[65px] rounded-md overflow-hidden group">
          <img src={preview} alt={`${label} reference`} className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={onClear}
            aria-label={`Remove ${label} reference`}
            className="absolute inset-0 bg-foreground/25 text-white flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <label className="dropzone size-[65px] flex flex-col items-center justify-center gap-1 cursor-pointer text-muted-foreground hover:text-foreground focus-within:ring-2 focus-within:ring-ring">
          <Upload className="size-4" strokeWidth={1.5} aria-hidden="true" />
          <span className="text-caption" aria-hidden="true">Add</span>
          <span className="sr-only">Upload {label} reference</span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
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
    <section className="bg-card rounded-lg p-3" aria-label="Settings">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="w-full flex items-center justify-between px-0 hover:bg-transparent"
            aria-expanded={isOpen}
          >
            <span className="text-heading-sm text-foreground">Settings</span>
            {isOpen ? (
              <ChevronUp className="text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <ChevronDown className="text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="pt-3 space-y-5">
          {/* Reference Images */}
          <div className="space-y-3 min-w-0" role="group" aria-labelledby="settings-reference-heading">
            <div className="flex items-center justify-between gap-2">
              <span id="settings-reference-heading" className="text-overline text-muted-foreground">Reference</span>
              <div className="flex items-center gap-2">
                <Label htmlFor="couple-mode">
                  Couple
                </Label>
                <Switch
                  id="couple-mode"
                  checked={coupleMode}
                  onCheckedChange={onCoupleModeChange}
                />
              </div>
            </div>
            <div className="flex gap-2">
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
          <div className="space-y-3 min-w-0" role="group" aria-labelledby="settings-output-heading">
            <span id="settings-output-heading" className="block text-overline text-muted-foreground">Output</span>
            <div className="space-y-1.5">
              <Label htmlFor="settings-model">Model</Label>
              <Select value={selectedModel} onValueChange={onModelChange}>
                <SelectTrigger id="settings-model">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-success" aria-hidden="true" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  <SelectItem value="gemini-2.5-flash-image">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-success" aria-hidden="true" />
                      Gemini 2.5 Flash Image
                    </div>
                  </SelectItem>
                  <SelectItem value="gemini-3-pro-image-preview">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-success" aria-hidden="true" />
                      Gemini 3 Pro Image
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Image Size - only for Gemini 3 */}
            {selectedModel === "gemini-3-pro-image-preview" && (
              <div className="space-y-1.5">
                <Label htmlFor="settings-quality">Quality</Label>
                <Select value={imageSize} onValueChange={onImageSizeChange}>
                  <SelectTrigger id="settings-quality">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="1K">1K</SelectItem>
                    <SelectItem value="2K">2K</SelectItem>
                    <SelectItem value="4K">4K</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-caption text-muted-foreground">Higher quality takes longer to generate.</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="settings-aspect-ratio">Aspect ratio</Label>
              <Select value={aspectRatio} onValueChange={onAspectRatioChange}>
                <SelectTrigger id="settings-aspect-ratio">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100]">
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
          <p className="text-caption text-tertiary-foreground flex items-center gap-1.5">
            <Sparkles className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
            Powered by Gemini
          </p>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
};
