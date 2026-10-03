import { Card } from "@/components/ui/card";
import { ImageUploader } from "./ImageUploader";
import { ModelSelector } from "./ModelSelector";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface GenerationSettingsProps {
  aspectRatio: string;
  onAspectRatioChange: (ratio: string) => void;
  resolution: string;
  onResolutionChange: (resolution: string) => void;
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
}

export const GenerationSettings = ({
  aspectRatio,
  onAspectRatioChange,
  resolution,
  onResolutionChange,
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
}: GenerationSettingsProps) => {

  return (
    <Card className="p-4 md:p-7 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Label>Reference</Label>
        <div className="flex items-center gap-2">
          <Label htmlFor="couple-mode-switch">Couple</Label>
          <Switch
            id="couple-mode-switch"
            checked={coupleMode}
            onCheckedChange={onCoupleModeChange}
          />
        </div>
      </div>

      {coupleMode ? (
        <div className="flex items-center gap-2">
          <ImageUploader onImageUpload={onImageUpload} onImageClear={onImageClear} previewUrl={previewUrl} />
          <ImageUploader onImageUpload={onSecondImageUpload} onImageClear={onSecondImageClear} previewUrl={secondPreviewUrl} />
        </div>
      ) : (
        <ImageUploader onImageUpload={onImageUpload} onImageClear={onImageClear} previewUrl={previewUrl} />
      )}

      <ModelSelector
        selectedModel={selectedModel}
        onModelChange={onModelChange}
        aspectRatio={aspectRatio}
        onAspectRatioChange={onAspectRatioChange}
        resolution={resolution}
        onResolutionChange={onResolutionChange}
      />
    </Card>
  );
};
