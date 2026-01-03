import { Card } from "@/components/ui/card";
import { ImageUploader } from "./ImageUploader";
import { ModelSelector } from "./ModelSelector";
import { Switch } from "@/components/ui/switch";

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
    <Card className="bg-card border-border p-1.5 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-medium text-muted-foreground uppercase">Ref</span>
        <div className="flex items-center gap-1">
          <span className="text-[8px] text-muted-foreground">Couple</span>
          <Switch
            checked={coupleMode}
            onCheckedChange={onCoupleModeChange}
            className="scale-[0.6]"
          />
        </div>
      </div>
      
      {coupleMode ? (
        <div className="grid grid-cols-2 gap-1">
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
