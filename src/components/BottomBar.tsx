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
import { User, Plus, X, Image, Palette, Type, Sparkles } from "lucide-react";
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

// Borderless grey-filled select trigger (32px) used for every compact control in the bar
const compactTriggerClass =
  "w-auto shrink-0 h-control-lg md:h-control-md px-3 rounded-md text-label-md gap-1.5";

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
  const isTextOnly = generationMode === "text-only";
  const hasAnyImage = images.some(img => img.previewUrl);

  const handleAddImage = () => {
    if (!hasEmptySlot && canAddMore) onAddImageSlot();
  };

  return (
    <div className="fixed bottom-bottom-nav md:bottom-0 left-0 right-0 flex justify-center px-3 pb-3 md:p-4 pointer-events-none z-sticky safe-bottom">
      <div
        className="flex items-center gap-2 w-full md:w-auto max-w-container-lg bg-card text-card-foreground border border-border rounded-lg shadow-overlay p-2 md:px-3 pointer-events-auto"
        role="toolbar"
        aria-label="Generation controls"
      >
        {/* Controls — one swipeable row on phones, inline on larger screens */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 md:gap-2 overflow-x-auto md:overflow-visible -m-1.5 p-1.5 md:m-0 md:p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Reference Images */}
          {images.map((image, index) => (
            <div key={index} className="relative group shrink-0">
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
                    className="size-10 md:size-8 rounded-md object-cover bg-control"
                  />
                  <button
                    type="button"
                    aria-label={`Remove reference ${index + 1}`}
                    onClick={() => onImageClear(index)}
                    className="absolute -top-1.5 -right-1.5 size-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="size-3" strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <label
                      htmlFor={`bottom-ref-image-${index}`}
                      aria-label="Upload reference photo"
                      className="dropzone size-10 md:size-8 flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground focus-within:border-ring"
                    >
                      <User className="size-4" strokeWidth={1.5} aria-hidden="true" />
                    </label>
                  </TooltipTrigger>
                  <TooltipContent>Upload reference photo</TooltipContent>
                </Tooltip>
              )}
            </div>
          ))}

          {/* Add Image - simplified: direct action */}
          {canAddMore && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-control-lg w-control-lg md:h-control-md md:w-control-md shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label={`Add reference (${images.length}/${maxImages})`}
                  onClick={handleAddImage}
                >
                  <Plus strokeWidth={1.5} aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add reference ({images.length}/{maxImages})</TooltipContent>
            </Tooltip>
          )}

          <div className="hidden md:block w-2" aria-hidden="true" />

          {/* Mode */}
          <Select value={generationMode} onValueChange={(v) => onGenerationModeChange(v as GenerationMode)}>
            <Tooltip>
              <TooltipTrigger asChild>
                <SelectTrigger className={compactTriggerClass} aria-label="Generation mode">
                  {isTextOnly ? (
                    <><Type className="size-4" strokeWidth={1.5} aria-hidden="true" /><span className="sr-only sm:not-sr-only">Text</span></>
                  ) : isStyleTransfer ? (
                    <><Palette className="size-4" strokeWidth={1.5} aria-hidden="true" /><span className="sr-only sm:not-sr-only">Style</span></>
                  ) : (
                    <><Image className="size-4" strokeWidth={1.5} aria-hidden="true" /><span className="sr-only sm:not-sr-only">Portrait</span></>
                  )}
                </SelectTrigger>
              </TooltipTrigger>
              <TooltipContent>Generation mode</TooltipContent>
            </Tooltip>
            <SelectContent>
              <SelectItem value="portrait">
                <div className="flex items-center gap-2"><Image className="size-4" strokeWidth={1.5} aria-hidden="true" /><span>Portrait</span></div>
              </SelectItem>
              <SelectItem value="text-only">
                <div className="flex items-center gap-2"><Type className="size-4" strokeWidth={1.5} aria-hidden="true" /><span>Text Only</span></div>
              </SelectItem>
              <SelectItem value="style-transfer">
                <div className="flex items-center gap-2"><Palette className="size-4" strokeWidth={1.5} aria-hidden="true" /><span>Style Transfer</span></div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Gender */}
          {isUnisexPack && onGenerationGenderChange && (
            <Select value={generationGender} onValueChange={(v) => onGenerationGenderChange(v as GenerationGender)}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SelectTrigger className={compactTriggerClass} aria-label="Generation gender">
                    <span>{generationGender === "male" ? "♂" : "♀"}</span>
                  </SelectTrigger>
                </TooltipTrigger>
                <TooltipContent>Gender</TooltipContent>
              </Tooltip>
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
                <SelectTrigger className={compactTriggerClass} aria-label="Aspect ratio">
                  <SelectValue />
                </SelectTrigger>
              </TooltipTrigger>
              <TooltipContent>Aspect ratio</TooltipContent>
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
                <SelectTrigger className={compactTriggerClass} aria-label="AI model">
                  <span>{modelLabel}</span>
                </SelectTrigger>
              </TooltipTrigger>
              <TooltipContent>AI model</TooltipContent>
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
                  <SelectTrigger className={compactTriggerClass} aria-label="Resolution">
                    <span>{resolution}</span>
                  </SelectTrigger>
                </TooltipTrigger>
                <TooltipContent>Resolution</TooltipContent>
              </Tooltip>
              <SelectContent>
                <SelectItem value="1K">1K</SelectItem>
                <SelectItem value="2K">2K</SelectItem>
                <SelectItem value="4K">4K</SelectItem>
              </SelectContent>
            </Select>
          )}

        </div>

        <div className="hidden md:block w-1" aria-hidden="true" />

        {/* Generate */}
        <Button
          variant="primary"
          size="md"
          className="shrink-0 h-control-lg md:h-control-md"
          onClick={onGenerate}
          disabled={!canGenerate || isGenerating}
          loading={isGenerating}
        >
          {isGenerating ? "Working..." : "Generate"}
          <Sparkles strokeWidth={1.5} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
};
