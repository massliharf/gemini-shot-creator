import { useState } from "react";
import { 
  Play, 
  Download, 
  Settings2, 
  Image as ImageIcon, 
  Ratio, 
  Cpu,
  ChevronUp,
  ChevronDown,
  Users,
  User,
  X,
  Maximize
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ControlsBarProps {
  // Settings
  aspectRatio: string;
  onAspectRatioChange: (value: string) => void;
  resolution: string;
  onResolutionChange: (value: string) => void;
  selectedModel: string;
  onModelChange: (value: string) => void;
  coupleMode: boolean;
  onCoupleModeChange: (value: boolean) => void;
  
  // Reference images
  previewUrl: string | null;
  secondPreviewUrl: string | null;
  onImageUpload: (file: File) => void;
  onImageClear: () => void;
  onSecondImageUpload: (file: File) => void;
  onSecondImageClear: () => void;
  
  // Actions
  onGenerate: () => void;
  onDownload: () => void;
  isGenerating: boolean;
  canGenerate: boolean;
  hasSelectedPack: boolean;
}

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

export const ControlsBar = ({
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
  onDownload,
  isGenerating,
  canGenerate,
  hasSelectedPack,
}: ControlsBarProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isGemini3Pro = selectedModel === "gemini-3-pro-image-preview";
  const computedSize = isGemini3Pro
    ? (PRO_SIZES[aspectRatio]?.[resolution] ?? PRO_SIZES["1:1"]["1K"])
    : (FLASH_SIZES[aspectRatio] ?? FLASH_SIZES["1:1"]);

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

  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-lg">
      {/* Main Controls Row */}
      <div className="p-3 flex items-center gap-3 flex-wrap">
        {/* Reference Image(s) */}
        <div className="flex items-center gap-2">
          {/* Primary Reference */}
          <div className="relative group">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileSelect(e)}
              className="hidden"
              id="ref-image-1"
            />
            {previewUrl ? (
              <div className="relative">
                <img 
                  src={previewUrl} 
                  alt="Reference" 
                  className="w-10 h-10 rounded-lg object-cover ring-2 ring-primary"
                />
                <button
                  onClick={onImageClear}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-2.5 h-2.5 text-white" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="ref-image-1"
                className="w-10 h-10 rounded-lg border-2 border-dashed border-primary/50 flex items-center justify-center cursor-pointer hover:bg-primary/5 transition-colors"
              >
                <User className="w-4 h-4 text-primary" />
              </label>
            )}
          </div>

          {/* Couple Mode Toggle & Second Reference */}
          {coupleMode && (
            <div className="relative group">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileSelect(e, true)}
                className="hidden"
                id="ref-image-2"
              />
              {secondPreviewUrl ? (
                <div className="relative">
                  <img 
                    src={secondPreviewUrl} 
                    alt="Reference 2" 
                    className="w-10 h-10 rounded-lg object-cover ring-2 ring-secondary"
                  />
                  <button
                    onClick={onSecondImageClear}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-2.5 h-2.5 text-white" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="ref-image-2"
                  className="w-10 h-10 rounded-lg border-2 border-dashed border-secondary/50 flex items-center justify-center cursor-pointer hover:bg-secondary/5 transition-colors"
                >
                  <User className="w-4 h-4 text-muted-foreground" />
                </label>
              )}
            </div>
          )}

          {/* Couple Mode Toggle */}
          <Button
            variant={coupleMode ? "default" : "outline"}
            size="icon"
            className="h-10 w-10 rounded-lg"
            onClick={() => onCoupleModeChange(!coupleMode)}
            title="Couple Mode"
          >
            <Users className="w-4 h-4" />
          </Button>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-border" />

        {/* Quick Settings */}
        <div className="flex items-center gap-2">
          {/* Aspect Ratio */}
          <Select value={aspectRatio} onValueChange={onAspectRatioChange}>
            <SelectTrigger className="w-[90px] h-9 text-xs rounded-lg">
              <Ratio className="w-3 h-3 mr-1" />
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

          {/* Resolution - Only for Gemini 3 Pro */}
          {isGemini3Pro && (
            <Select value={resolution} onValueChange={onResolutionChange}>
              <SelectTrigger className="w-[80px] h-9 text-xs rounded-lg">
                <Maximize className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1K">1K</SelectItem>
                <SelectItem value="2K">2K</SelectItem>
                <SelectItem value="4K">4K</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Model */}
          <Select value={selectedModel} onValueChange={onModelChange}>
            <SelectTrigger className="w-[140px] h-9 text-xs rounded-lg">
              <Cpu className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gemini-2.5-flash-image">Flash Image</SelectItem>
              <SelectItem value="gemini-3-pro-image-preview">Pro Image</SelectItem>
            </SelectContent>
          </Select>

          {/* Computed size */}
          <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground pl-1">
            <ImageIcon className="w-3 h-3" />
            <span>{formatSize(computedSize)}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-border" />

        {/* Action Buttons */}
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onDownload}
            disabled={!hasSelectedPack}
            className="h-9 px-4 rounded-lg"
          >
            <Download className="w-4 h-4 mr-1.5" />
            İndir
          </Button>

          <Button
            onClick={onGenerate}
            disabled={!canGenerate || isGenerating}
            className="h-9 px-5 rounded-lg bg-primary hover:bg-primary/90"
          >
            {isGenerating ? (
              <>
                <span className="w-4 h-4 mr-1.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Üretiliyor...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-1.5" />
                Oluştur
              </>
            )}
          </Button>

          {/* Expand/Collapse Settings */}
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>
      </div>

      {/* Expanded Settings */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0 border-t border-border/50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">En-Boy Oranı</Label>
                <Select value={aspectRatio} onValueChange={onAspectRatioChange}>
                  <SelectTrigger className="h-9 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1:1">1:1 (Kare)</SelectItem>
                    <SelectItem value="2:3">2:3 (Portre)</SelectItem>
                    <SelectItem value="3:2">3:2 (Yatay)</SelectItem>
                    <SelectItem value="3:4">3:4 (Portre)</SelectItem>
                    <SelectItem value="4:3">4:3 (Yatay)</SelectItem>
                    <SelectItem value="4:5">4:5 (Portre)</SelectItem>
                    <SelectItem value="5:4">5:4 (Yatay)</SelectItem>
                    <SelectItem value="9:16">9:16 (Dikey)</SelectItem>
                    <SelectItem value="16:9">16:9 (Geniş)</SelectItem>
                    <SelectItem value="21:9">21:9 (Ultra geniş)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">Boyut: {formatSize(computedSize)}</p>
              </div>

              {isGemini3Pro && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Çözünürlük</Label>
                  <Select value={resolution} onValueChange={onResolutionChange}>
                    <SelectTrigger className="h-9 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1K">1K</SelectItem>
                      <SelectItem value="2K">2K</SelectItem>
                      <SelectItem value="4K">4K</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">AI Model</Label>
                <Select value={selectedModel} onValueChange={onModelChange}>
                  <SelectTrigger className="h-9 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini-2.5-flash-image">Gemini Flash Image</SelectItem>
                    <SelectItem value="gemini-3-pro-image-preview">Gemini Pro Image</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Çift Modu</Label>
                <div className="flex items-center gap-2 h-9">
                  <Switch
                    checked={coupleMode}
                    onCheckedChange={onCoupleModeChange}
                  />
                  <span className="text-sm text-muted-foreground">
                    {coupleMode ? "Açık" : "Kapalı"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
