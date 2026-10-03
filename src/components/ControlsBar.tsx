import { useState } from "react";
import {
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
  Maximize,
  Sparkles
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
    <div className="bg-card text-card-foreground rounded-lg" role="toolbar" aria-label="Üretim araç çubuğu">
      {/* Main Controls Row */}
      <div className="p-3 flex items-center gap-2 flex-wrap">
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
                  alt="Referans"
                  className="size-control-md rounded-md object-cover ring-1 ring-foreground/80"
                />
                <button
                  type="button"
                  onClick={onImageClear}
                  aria-label="Referansı kaldır"
                  className="absolute -top-1.5 -right-1.5 size-5 bg-card/90 text-foreground rounded-full flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-3" strokeWidth={1.5} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="ref-image-1"
                aria-label="Referans görsel yükle"
                className="dropzone size-control-md flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <User className="size-4" strokeWidth={1.5} aria-hidden="true" />
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
                    alt="Referans 2"
                    className="size-control-md rounded-md object-cover"
                  />
                  <button
                    type="button"
                    onClick={onSecondImageClear}
                    aria-label="İkinci referansı kaldır"
                    className="absolute -top-1.5 -right-1.5 size-5 bg-card/90 text-foreground rounded-full flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="size-3" strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="ref-image-2"
                  aria-label="İkinci referans görsel yükle"
                  className="dropzone size-control-md flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  <User className="size-4" strokeWidth={1.5} aria-hidden="true" />
                </label>
              )}
            </div>
          )}

          {/* Couple Mode Toggle */}
          <Button
            type="button"
            variant={coupleMode ? "secondary" : "ghost"}
            size="icon"
            onClick={() => onCoupleModeChange(!coupleMode)}
            title="Çift modu"
            aria-label="Çift modu"
            aria-pressed={coupleMode}
            className={coupleMode ? "bg-active" : undefined}
          >
            <Users strokeWidth={1.5} aria-hidden="true" />
          </Button>
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-1" aria-hidden="true" />

        {/* Quick Settings */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Aspect Ratio */}
          <Select value={aspectRatio} onValueChange={onAspectRatioChange}>
            <SelectTrigger className="w-auto min-w-[96px] gap-1.5" aria-label="En-boy oranı">
              <Ratio className="size-4 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
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
              <SelectTrigger className="w-auto min-w-[88px] gap-1.5" aria-label="Çözünürlük">
                <Maximize className="size-4 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
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
            <SelectTrigger className="w-auto min-w-[150px] gap-1.5" aria-label="AI model">
              <Cpu className="size-4 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gemini-2.5-flash-image">Flash Image</SelectItem>
              <SelectItem value="gemini-3-pro-image-preview">Pro Image</SelectItem>
            </SelectContent>
          </Select>

          {/* Computed size */}
          <div className="hidden md:flex items-center gap-1 text-caption text-muted-foreground pl-1">
            <ImageIcon className="size-4" strokeWidth={1.5} aria-hidden="true" />
            <span>{formatSize(computedSize)}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-1" aria-hidden="true" />

        {/* Action Buttons */}
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onDownload}
            disabled={!hasSelectedPack}
          >
            <Download className="size-4" strokeWidth={1.5} aria-hidden="true" />
            İndir
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={onGenerate}
            disabled={!canGenerate || isGenerating}
            aria-busy={isGenerating || undefined}
          >
            {isGenerating ? (
              <>
                <span
                  className="size-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"
                  aria-hidden="true"
                />
                Üretiliyor...
              </>
            ) : (
              <>
                Oluştur
                <Sparkles className="size-4" strokeWidth={1.5} aria-hidden="true" />
              </>
            )}
          </Button>

          {/* Expand/Collapse Settings */}
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={isExpanded ? "Gelişmiş ayarları gizle" : "Gelişmiş ayarları göster"}
                aria-expanded={isExpanded}
              >
                {isExpanded ? (
                  <ChevronDown strokeWidth={1.5} aria-hidden="true" />
                ) : (
                  <ChevronUp strokeWidth={1.5} aria-hidden="true" />
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>
      </div>

      {/* Expanded Settings */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <div className="mx-3 mb-3 px-3 pb-3 bg-app rounded-[12px]">
            <div className="flex items-center gap-2 pt-3 pb-3">
              <Settings2 className="size-4 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
              <span className="text-heading-sm text-foreground">Gelişmiş ayarlar</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="controls-aspect-ratio">En-boy oranı</Label>
                <Select value={aspectRatio} onValueChange={onAspectRatioChange}>
                  <SelectTrigger id="controls-aspect-ratio">
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
                <p className="text-caption text-muted-foreground">Boyut: {formatSize(computedSize)}</p>
              </div>

              {isGemini3Pro && (
                <div className="space-y-1.5">
                  <Label htmlFor="controls-resolution">Çözünürlük</Label>
                  <Select value={resolution} onValueChange={onResolutionChange}>
                    <SelectTrigger id="controls-resolution">
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
                <Label htmlFor="controls-model">AI model</Label>
                <Select value={selectedModel} onValueChange={onModelChange}>
                  <SelectTrigger id="controls-model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini-2.5-flash-image">Gemini Flash Image</SelectItem>
                    <SelectItem value="gemini-3-pro-image-preview">Gemini Pro Image</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="controls-couple-mode">Çift modu</Label>
                <div className="flex items-center gap-2 h-control-lg md:h-control-md">
                  <Switch
                    id="controls-couple-mode"
                    checked={coupleMode}
                    onCheckedChange={onCoupleModeChange}
                  />
                  <span className="text-label-md text-muted-foreground">
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
