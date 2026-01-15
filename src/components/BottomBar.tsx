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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { User, Plus, ChevronDown, X, Users } from "lucide-react";

type GenerationGender = "male" | "female";

interface BottomBarProps {
  aspectRatio: string;
  onAspectRatioChange: (value: string) => void;
  resolution: string;
  onResolutionChange: (value: string) => void;
  selectedModel: string;
  onModelChange: (value: string) => void;
  coupleMode: boolean;
  onCoupleModeChange: (value: boolean) => void;
  previewUrl: string | null;
  secondPreviewUrl: string | null;
  onImageUpload: (file: File) => void;
  onImageClear: () => void;
  onSecondImageUpload: (file: File) => void;
  onSecondImageClear: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
  canGenerate: boolean;
  // Unisex pack gender selection
  isUnisexPack?: boolean;
  generationGender?: GenerationGender;
  onGenerationGenderChange?: (gender: GenerationGender) => void;
}

export const BottomBar = ({
  aspectRatio,
  onAspectRatioChange,
  resolution,
  onResolutionChange,
  selectedModel,
  onModelChange,
  coupleMode,
  onCoupleModeChange,
  previewUrl,
  secondPreviewUrl,
  onImageUpload,
  onImageClear,
  onSecondImageUpload,
  onSecondImageClear,
  onGenerate,
  isGenerating,
  canGenerate,
  isUnisexPack = false,
  generationGender = "female",
  onGenerationGenderChange,
}: BottomBarProps) => {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isSecond = false) => {
    const file = e.target.files?.[0];
    if (file) {
      if (isSecond) {
        onSecondImageUpload(file);
      } else {
        onImageUpload(file);
      }
    }
  };

  const isProModel = selectedModel === "gemini-3-pro-image-preview";
  const modelLabel = isProModel ? "PRO" : "FLASH";

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center p-6 pointer-events-none z-50">
      <div className="flex items-center gap-3 bg-background border border-border rounded-full px-4 py-2.5 shadow-md pointer-events-auto">
        {/* Reference Image */}
        <div className="relative group">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileSelect(e)}
            className="hidden"
            id="bottom-ref-image"
          />
          {previewUrl ? (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Reference"
                className="w-10 h-10 rounded-full object-cover ring-2 ring-foreground"
              />
              <button
                onClick={onImageClear}
                className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-2.5 h-2.5 text-destructive-foreground" />
              </button>
            </div>
          ) : (
            <label
              htmlFor="bottom-ref-image"
              className="w-10 h-10 rounded-full border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-muted-foreground transition-colors"
            >
              <User className="w-4 h-4 text-muted-foreground" />
            </label>
          )}
        </div>

        {/* Second Reference (Couple Mode) */}
        {coupleMode && (
          <div className="relative group">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileSelect(e, true)}
              className="hidden"
              id="bottom-ref-image-2"
            />
            {secondPreviewUrl ? (
              <div className="relative">
                <img
                  src={secondPreviewUrl}
                  alt="Reference 2"
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-muted-foreground"
                />
                <button
                  onClick={onSecondImageClear}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-2.5 h-2.5 text-destructive-foreground" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="bottom-ref-image-2"
                className="w-10 h-10 rounded-full border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-muted-foreground transition-colors"
              >
                <User className="w-4 h-4 text-muted-foreground" />
              </label>
            )}
          </div>
        )}

        {/* Add Menu */}
        <Popover open={showAddMenu} onOpenChange={setShowAddMenu}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="center">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 h-9"
              onClick={() => {
                onCoupleModeChange(!coupleMode);
                setShowAddMenu(false);
              }}
            >
              <Users className="w-4 h-4" />
              {coupleMode ? "Disable Couple Mode" : "Enable Couple Mode"}
            </Button>
          </PopoverContent>
        </Popover>

        {/* Gender Selector - Only for Unisex Packs */}
        {isUnisexPack && onGenerationGenderChange && (
          <Select value={generationGender} onValueChange={(v) => onGenerationGenderChange(v as GenerationGender)}>
            <SelectTrigger className="w-auto h-10 px-4 rounded-full border border-primary/50 bg-primary/10 text-sm font-medium gap-2">
              <span>{generationGender === "male" ? "♂ Male" : "♀ Female"}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="female">♀ Female</SelectItem>
              <SelectItem value="male">♂ Male</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Aspect Ratio */}
        <Select value={aspectRatio} onValueChange={onAspectRatioChange}>
          <SelectTrigger className="w-auto h-10 px-4 rounded-full border border-border bg-background text-sm font-medium gap-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1:1">1:1</SelectItem>
            <SelectItem value="2:3">2:3</SelectItem>
            <SelectItem value="3:2">3:2</SelectItem>
            <SelectItem value="3:4">3:4</SelectItem>
            <SelectItem value="4:3">4:3</SelectItem>
            <SelectItem value="4:5">4:5</SelectItem>
            <SelectItem value="5:4">5:4</SelectItem>
            <SelectItem value="9:16">9:16</SelectItem>
            <SelectItem value="16:9">16:9</SelectItem>
            <SelectItem value="21:9">21:9</SelectItem>
          </SelectContent>
        </Select>

        {/* Model Selector */}
        <Select value={selectedModel} onValueChange={onModelChange}>
          <SelectTrigger className="w-auto h-10 px-4 rounded-full border border-border bg-background text-sm font-medium gap-2">
            <span>{modelLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-50" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gemini-2.5-flash-image">FLASH</SelectItem>
            <SelectItem value="gemini-3-pro-image-preview">PRO</SelectItem>
          </SelectContent>
        </Select>

        {/* Resolution Selector - Only for PRO model */}
        {isProModel && (
          <Select value={resolution} onValueChange={onResolutionChange}>
            <SelectTrigger className="w-auto h-10 px-4 rounded-full border border-border bg-background text-sm font-medium gap-2">
              <span>{resolution}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1K">1K</SelectItem>
              <SelectItem value="2K">2K</SelectItem>
              <SelectItem value="4K">4K</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Generate Button */}
        <Button
          onClick={onGenerate}
          disabled={!canGenerate || isGenerating}
          className="h-10 px-6 rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium"
        >
          {isGenerating ? (
            <>
              <span className="w-4 h-4 mr-2 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            "GENERATE"
          )}
        </Button>
      </div>
    </div>
  );
};
