import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { User, Plus, X, Image, Palette } from "lucide-react";
import { ReferenceImage } from "@/hooks/useReferenceImages";
import { GenerationMode } from "@/hooks/useGenerationSettings";

type GenerationGender = "male" | "female";

interface BottomBarProps {
  aspectRatio: string;
  onAspectRatioChange: (value: string) => void;
  resolution: string;
  onResolutionChange: (value: string) => void;
  selectedModel: string;
  onModelChange: (value: string) => void;
  images: ReferenceImage[];
  onImageUpload: (file: File, index: number) => void;
  onImageClear: (index: number) => void;
  onAddImageSlot: () => void;
  maxImages: number;
  onGenerate: () => void;
  isGenerating: boolean;
  canGenerate: boolean;
  isUnisexPack?: boolean;
  generationGender?: GenerationGender;
  onGenerationGenderChange?: (gender: GenerationGender) => void;
  generationMode: GenerationMode;
  onGenerationModeChange: (mode: GenerationMode) => void;
}

export const BottomBar = ({
  aspectRatio,
  onAspectRatioChange,
  resolution,
  onResolutionChange,
  selectedModel,
  onModelChange,
  images,
  onImageUpload,
  onImageClear,
  onAddImageSlot,
  maxImages,
  onGenerate,
  isGenerating,
  canGenerate,
  isUnisexPack = false,
  generationGender = "female",
  onGenerationGenderChange,
  generationMode,
  onGenerationModeChange,
}: BottomBarProps) => {
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) onImageUpload(file, index);
    e.target.value = "";
  };

  const isProModel = selectedModel === "gemini-3-pro-image-preview" || selectedModel === "gemini-3.1-flash-image-preview";
  const modelLabel = selectedModel === "gemini-3-pro-image-preview" ? "Pro" : selectedModel === "gemini-3.1-flash-image-preview" ? "3.1" : "Flash";
  const canAddMore = images.length < maxImages;
  const hasEmptySlot = images.some(img => !img.previewUrl);
  const isStyleTransfer = generationMode === "style-transfer";

  const handleAddImage = () => {
    if (!hasEmptySlot && canAddMore) onAddImageSlot();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center p-4 pointer-events-none z-50">
      <div className="flex items-center gap-1.5 bg-card/90 dark:bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl px-3 py-2 shadow-lg pointer-events-auto">
        {/* Reference Images */}
        {images.map((image, index) => (
          <div key={index} className="relative group">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileSelect(e, index)}
              className="hidden"
              id={`bottom-ref-image-${index}`}
            />
            {image.previewUrl ? (
              <div className="relative">
                <img
                  src={image.previewUrl}
                  alt={`Ref ${index + 1}`}
                  className="w-9 h-9 rounded-lg object-cover ring-1 ring-border/50"
                />
                <button
                  onClick={() => onImageClear(index)}
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-2 h-2 text-background" />
                </button>
              </div>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <label
                    htmlFor={`bottom-ref-image-${index}`}
                    className="w-9 h-9 rounded-lg border border-dashed border-border flex items-center justify-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                  >
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                  </label>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Upload reference photo</TooltipContent>
              </Tooltip>
            )}
          </div>
        ))}

        {/* Add Image - simplified: direct action */}
        {canAddMore && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                onClick={handleAddImage}
              >
                <Plus className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">Add reference ({images.length}/{maxImages})</TooltipContent>
          </Tooltip>
        )}

        <div className="w-px h-6 bg-border/50" />

        {/* Mode */}
        <Select value={generationMode} onValueChange={(v) => onGenerationModeChange(v as GenerationMode)}>
          <Tooltip>
            <TooltipTrigger asChild>
              <SelectTrigger className="w-auto h-8 px-3 rounded-lg border-0 bg-transparent text-xs font-medium gap-1.5 hover:bg-accent transition-colors">
                {isStyleTransfer ? (
                  <><Palette className="w-3.5 h-3.5" /><span>Style</span></>
                ) : (
                  <><Image className="w-3.5 h-3.5" /><span>Portrait</span></>
                )}
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent className="text-xs">Generation mode</TooltipContent>
          </Tooltip>
          <SelectContent>
            <SelectItem value="portrait">
              <div className="flex items-center gap-2"><Image className="w-3.5 h-3.5" /><span>Portrait</span></div>
            </SelectItem>
            <SelectItem value="style-transfer">
              <div className="flex items-center gap-2"><Palette className="w-3.5 h-3.5" /><span>Style Transfer</span></div>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Gender */}
        {isUnisexPack && onGenerationGenderChange && (
          <Select value={generationGender} onValueChange={(v) => onGenerationGenderChange(v as GenerationGender)}>
            <SelectTrigger className="w-auto h-8 px-3 rounded-lg border-0 bg-transparent text-xs font-medium">
              <span>{generationGender === "male" ? "♂" : "♀"}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="female">♀ Female</SelectItem>
              <SelectItem value="male">♂ Male</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Aspect Ratio */}
        <Select value={aspectRatio} onValueChange={onAspectRatioChange}>
          <Tooltip>
            <TooltipTrigger asChild>
              <SelectTrigger className="w-auto h-8 px-3 rounded-lg border-0 bg-transparent text-xs font-medium hover:bg-accent transition-colors">
                <SelectValue />
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent className="text-xs">Aspect ratio</TooltipContent>
          </Tooltip>
          <SelectContent>
            {["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"].map(r => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Model */}
        <Select value={selectedModel} onValueChange={onModelChange}>
          <Tooltip>
            <TooltipTrigger asChild>
              <SelectTrigger className="w-auto h-8 px-3 rounded-lg border-0 bg-transparent text-xs font-medium hover:bg-accent transition-colors">
                <span>{modelLabel}</span>
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent className="text-xs">AI model</TooltipContent>
          </Tooltip>
          <SelectContent>
            <SelectItem value="gemini-2.5-flash-image">Flash</SelectItem>
            <SelectItem value="gemini-3.1-flash-image-preview">3.1 Flash</SelectItem>
            <SelectItem value="gemini-3-pro-image-preview">Pro</SelectItem>
          </SelectContent>
        </Select>

        {/* Resolution */}
        {isProModel && (
          <Select value={resolution} onValueChange={onResolutionChange}>
            <Tooltip>
              <TooltipTrigger asChild>
                <SelectTrigger className="w-auto h-8 px-3 rounded-lg border-0 bg-transparent text-xs font-medium hover:bg-accent transition-colors">
                  <span>{resolution}</span>
                </SelectTrigger>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Resolution</TooltipContent>
            </Tooltip>
            <SelectContent>
              <SelectItem value="1K">1K</SelectItem>
              <SelectItem value="2K">2K</SelectItem>
              <SelectItem value="4K">4K</SelectItem>
            </SelectContent>
          </Select>
        )}

        <div className="w-px h-6 bg-border/50" />

        {/* Generate */}
        <Button
          onClick={onGenerate}
          disabled={!canGenerate || isGenerating}
          className="h-8 px-5 rounded-lg bg-foreground text-background hover:bg-foreground/90 text-xs font-semibold"
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              Working...
            </span>
          ) : (
            "Generate"
          )}
        </Button>
      </div>
    </div>
  );
};
