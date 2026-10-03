import { useState, useMemo } from "react";
import { PackFile, getPackId, getPackName, getPackCategory, getPackGender, getPackTags, hasScenes, getSceneCount } from "@/types/pack";
import {
  Briefcase, Palette, Wand2, Film, Clock, Shirt, Plane, Sun, Globe2, GraduationCap,
  Users, User, Sparkles, Upload, Loader2, Trash2, Play, Download, HardDrive, Bomb,
  ChevronDown, ChevronRight, AlertCircle, CheckCircle2, Circle, XCircle, SquareCheck, Square, X
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type PacksLoadResult = {
  uploadedCount: number;
  failed: Array<{ index: number; message: string }>;
};

export interface PackInfo {
  pack: PackFile;
  packId: string;
  totalShots: number;
  completedShots: number;
  failedShots: number;
  generatingShots: number;
}

interface PackSidebarProps {
  packs: PackInfo[];
  selectedPackId: string | null;
  onSelectPack: (packId: string) => void;
  onDeletePack: (packId: string) => void;
  onPacksLoad: (packs: PackFile[]) => Promise<PacksLoadResult>;
  onGenerateAllPacks?: () => void;
  onDownloadAllPacks?: () => void;
  onDownloadPacksByGender?: (gender: string) => void;
  onDownloadAllCloudData?: () => void;
  onDeleteAllCloudData?: () => void;
  onDeleteAllPacks?: () => void;
  onDownloadPackOptimized?: (packId: string) => void;
  onDeleteMultiplePacks?: (packIds: string[]) => void;
  onDownloadMultiplePacks?: (packIds: string[]) => void;
  isGeneratingAll?: boolean;
}

const categoryIconClass = "size-4 text-muted-foreground";

const categoryIcons: Record<string, React.ReactNode> = {
  photography: <Film className={categoryIconClass} strokeWidth={1.5} aria-hidden="true" />,
  "3d": <Wand2 className={categoryIconClass} strokeWidth={1.5} aria-hidden="true" />,
  art: <Palette className={categoryIconClass} strokeWidth={1.5} aria-hidden="true" />,
  illustration: <Palette className={categoryIconClass} strokeWidth={1.5} aria-hidden="true" />,
  painting: <Palette className={categoryIconClass} strokeWidth={1.5} aria-hidden="true" />,
  professional: <Briefcase className={categoryIconClass} strokeWidth={1.5} aria-hidden="true" />,
  artistic: <Palette className={categoryIconClass} strokeWidth={1.5} aria-hidden="true" />,
  fantasy: <Wand2 className={categoryIconClass} strokeWidth={1.5} aria-hidden="true" />,
  cinematic: <Film className={categoryIconClass} strokeWidth={1.5} aria-hidden="true" />,
  historical: <Clock className={categoryIconClass} strokeWidth={1.5} aria-hidden="true" />,
  fashion: <Shirt className={categoryIconClass} strokeWidth={1.5} aria-hidden="true" />,
  travel: <Plane className={categoryIconClass} strokeWidth={1.5} aria-hidden="true" />,
  seasonal: <Sun className={categoryIconClass} strokeWidth={1.5} aria-hidden="true" />,
  cultural: <Globe2 className={categoryIconClass} strokeWidth={1.5} aria-hidden="true" />,
  career: <GraduationCap className={categoryIconClass} strokeWidth={1.5} aria-hidden="true" />,
  other: <Sparkles className={categoryIconClass} strokeWidth={1.5} aria-hidden="true" />,
};

const genderIcons: Record<string, React.ReactNode> = {
  male: <User className="size-3" strokeWidth={1.5} aria-hidden="true" />,
  female: <User className="size-3" strokeWidth={1.5} aria-hidden="true" />,
  any: <Users className="size-3" strokeWidth={1.5} aria-hidden="true" />,
  unisex: <Users className="size-3" strokeWidth={1.5} aria-hidden="true" />,
};

const genderLabels: Record<string, string> = {
  male: "Male",
  female: "Female", 
  any: "All",
  unisex: "Unisex",
};

type GenderFilter = "all" | "male" | "female" | "unisex";
type GenerationFilter = "all" | "generated" | "pending";

const GENDER_FILTERS: { value: GenderFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "unisex", label: "Unisex" },
];

const GENERATION_FILTERS: { value: GenerationFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "generated", label: "Generated" },
  { value: "pending", label: "Pending" },
];


// JSON Uploader Component
const JsonUploader = ({ onPacksLoad }: { onPacksLoad: (packs: PackFile[]) => Promise<PacksLoadResult> }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePaste = async () => {
    if (!jsonText.trim()) {
      setError("Please paste JSON content");
      return;
    }

    const extractJsonSlice = (raw: string) => {
      let s = raw.trim();

      // Strip markdown fences
      if (s.startsWith("```json")) s = s.slice(7);
      else if (s.startsWith("```")) s = s.slice(3);
      if (s.endsWith("```")) s = s.slice(0, -3);
      s = s.trim();

      // Slice to first JSON bracket and last matching bracket
      const firstCurly = s.indexOf("{");
      const firstSquare = s.indexOf("[");
      const start =
        firstCurly === -1
          ? firstSquare
          : firstSquare === -1
            ? firstCurly
            : Math.min(firstCurly, firstSquare);

      if (start === -1) return s;

      const lastCurly = s.lastIndexOf("}");
      const lastSquare = s.lastIndexOf("]");
      const end = Math.max(lastCurly, lastSquare);

      if (end === -1 || end <= start) return s.slice(start);
      return s.slice(start, end + 1);
    };

    const normalizeToPacks = (parsed: any): PackFile[] => {
      // Common wrapper: { success: true, pack: {...} }
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        if (parsed.pack && typeof parsed.pack === "object") return [parsed.pack as PackFile];
        if (Array.isArray(parsed.packs)) return parsed.packs as PackFile[];
        if (Array.isArray(parsed.data)) return parsed.data as PackFile[];
        if (parsed.data && typeof parsed.data === "object") {
          if (parsed.data.pack) return [parsed.data.pack as PackFile];
          if (Array.isArray(parsed.data.packs)) return parsed.data.packs as PackFile[];
        }
      }

      // Direct array or direct pack
      if (Array.isArray(parsed)) return parsed as PackFile[];
      return [parsed as PackFile];
    };

    setIsUploading(true);
    setError(null);

    try {
      const slice = extractJsonSlice(jsonText);
      const parsed = JSON.parse(slice);
      const packs = normalizeToPacks(parsed);

      for (const pack of packs) {
        const packId = getPackId(pack);
        const packName = getPackName(pack);

        if (!packId || !packName) {
          setError("Invalid JSON: missing pack_id or package_name");
          setIsUploading(false);
          return;
        }
        if (!hasScenes(pack)) {
          setError("Invalid JSON: missing or empty scenes array");
          setIsUploading(false);
          return;
        }
      }

      const result = await onPacksLoad(packs);

      if (result.uploadedCount > 0) {
        setJsonText("");
        setIsOpen(false);
        toast.success(`${result.uploadedCount} pack(s) uploaded`);
      }
      if (result.failed.length > 0) {
        setError(`${result.failed.length} pack(s) failed`);
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("Invalid JSON syntax");
      } else {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="dropzone w-full h-control-lg md:h-control-md px-3 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          <Upload className="size-4" strokeWidth={1.5} aria-hidden="true" />
          <span className="text-label-md">Upload JSON</span>
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Paste JSON pack</AlertDialogTitle>
          <AlertDialogDescription>
            Paste your JSON pack content below.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="json-pack-input">Pack JSON</Label>
          <Textarea
            id="json-pack-input"
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setError(null);
            }}
            placeholder='{"package_meta": {...}, "global_render_settings": {...}, "shots": [...]}'
            className="h-48 text-code resize-none"
            disabled={isUploading}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "json-pack-error" : undefined}
          />
          {error && (
            <div id="json-pack-error" className="flex items-center gap-2 text-danger-text text-body-sm" role="alert">
              <XCircle className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isUploading} className={buttonVariants({ variant: "outline" })}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            variant="primary"
            onClick={handlePaste}
            disabled={isUploading || !jsonText.trim()}
            loading={isUploading}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// Pack Card Component
const PackCard = ({ 
  pack, 
  isSelected, 
  onSelect, 
  onDelete,
  onDownloadOptimized,
  isSelectionMode,
  isChecked,
  onToggleCheck,
}: { 
  pack: PackInfo; 
  isSelected: boolean; 
  onSelect: () => void; 
  onDelete: () => void;
  onDownloadOptimized?: () => void;
  isSelectionMode?: boolean;
  isChecked?: boolean;
  onToggleCheck?: () => void;
}) => {
  const gender = getPackGender(pack.pack) || "any";
  const packName = getPackName(pack.pack);
  const tags = getPackTags(pack.pack);
  const progress = pack.totalShots > 0 
    ? Math.round((pack.completedShots / pack.totalShots) * 100) 
    : 0;

  const getStatusIcon = () => {
    if (pack.generatingShots > 0) return <Loader2 className="size-4 animate-spin text-foreground" strokeWidth={1.5} aria-label="Generating" role="img" />;
    if (pack.completedShots === pack.totalShots && pack.totalShots > 0) return <CheckCircle2 className="size-4 text-success" strokeWidth={1.5} aria-label="Completed" role="img" />;
    if (pack.failedShots > 0) return <XCircle className="size-4 text-destructive" strokeWidth={1.5} aria-label="Has failures" role="img" />;
    return <Circle className="size-4 text-tertiary-foreground" strokeWidth={1.5} aria-label="Not started" role="img" />;
  };

  const handleClick = () => {
    if (isSelectionMode && onToggleCheck) {
      onToggleCheck();
    } else {
      onSelect();
    }
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-pressed={isSelectionMode ? isChecked : isSelected}
      className={`
        group relative min-h-control-lg md:min-h-control-md px-2 py-1 rounded-md cursor-pointer overflow-hidden text-label-md
        transition-colors duration-fast ease-standard
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card
        ${isSelected && !isSelectionMode
          ? 'bg-active text-foreground'
          : isChecked && isSelectionMode
            ? 'bg-active text-foreground'
            : 'text-muted-foreground hover:bg-control hover:text-foreground'
        }
      `}
    >
      {/* Progress bar */}
      {progress > 0 && progress < 100 && (
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-foreground rounded-full transition-[width] duration-normal ease-standard"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Generation progress"
        />
      )}

      <div className="flex items-center gap-2">
        {isSelectionMode ? (
          <span className="size-6 shrink-0 flex items-center justify-center">
            <Checkbox
              checked={isChecked}
              onClick={(e) => e.stopPropagation()}
              onCheckedChange={onToggleCheck}
              aria-label={`Select ${packName || "Unnamed"}`}
            />
          </span>
        ) : (
          <span className="size-6 shrink-0 rounded-xs bg-control flex items-center justify-center">{getStatusIcon()}</span>
        )}

        <div className="flex-1 min-w-0">
          <h4 className="text-label-md text-foreground truncate">
            {packName || "Unnamed"}
          </h4>
          <div className="flex items-center gap-2 text-caption text-muted-foreground">
            <span className="flex items-center gap-1">
              {genderIcons[gender] || genderIcons.any}
              {genderLabels[gender] || genderLabels.any}
            </span>
            <span className="tabular-nums">
              {pack.completedShots}/{pack.totalShots}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-0.5 -mr-1">
          {/* Download Optimized Button */}
          {pack.completedShots > 0 && onDownloadOptimized && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity duration-fast ease-standard"
              onClick={(e) => {
                e.stopPropagation();
                onDownloadOptimized();
              }}
              title="Download WebP + Original"
              aria-label="Download WebP + Original"
            >
              <Download strokeWidth={1.5} aria-hidden="true" />
            </Button>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity duration-fast ease-standard"
                onClick={(e) => e.stopPropagation()}
                aria-label={`Delete ${packName || "Unnamed"}`}
              >
                <Trash2 className="text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete pack?</AlertDialogTitle>
                <AlertDialogDescription>
                  "{packName}" and all its images will be deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className={buttonVariants({ variant: "outline" })}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className={buttonVariants({ variant: "danger" })}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Tags */}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1 pl-8">
          {tags.slice(0, 2).map((tag, idx) => (
            <Badge key={idx} variant="default">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export const PackSidebar = ({ 
  packs, 
  selectedPackId, 
  onSelectPack, 
  onDeletePack,
  onPacksLoad,
  onGenerateAllPacks,
  onDownloadAllPacks,
  onDownloadPacksByGender,
  onDownloadAllCloudData,
  onDeleteAllCloudData,
  onDeleteAllPacks,
  onDownloadPackOptimized,
  onDeleteMultiplePacks,
  onDownloadMultiplePacks,
  isGeneratingAll = false,
}: PackSidebarProps) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");
  const [generationFilter, setGenerationFilter] = useState<GenerationFilter>("all");
  
  // Selection mode state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds(new Set(filteredPacks.map((p) => p.packId)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleBatchDelete = () => {
    if (onDeleteMultiplePacks && selectedIds.size > 0) {
      onDeleteMultiplePacks(Array.from(selectedIds));
      exitSelectionMode();
    }
  };

  const handleBatchDownload = () => {
    if (onDownloadMultiplePacks && selectedIds.size > 0) {
      onDownloadMultiplePacks(Array.from(selectedIds));
    }
  };

  // Filter packs by gender and generation status
  const filteredPacks = useMemo(() => {
    return packs.filter(pack => {
      // Gender filter
      if (genderFilter !== "all") {
        const gender = getPackGender(pack.pack) || "unisex";
        if (gender !== genderFilter) return false;
      }
      
      // Generation filter
      if (generationFilter === "generated") {
        return pack.completedShots === pack.totalShots && pack.totalShots > 0;
      } else if (generationFilter === "pending") {
        return pack.completedShots < pack.totalShots || pack.totalShots === 0;
      }
      
      return true;
    });
  }, [packs, genderFilter, generationFilter]);

  // Group packs by category
  const groupedPacks = useMemo(() => {
    const groups: Record<string, PackInfo[]> = {};
    
    for (const pack of filteredPacks) {
      const category = getPackCategory(pack.pack) || "other";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(pack);
    }
    
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredPacks]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  return (
    <div className="h-full flex flex-col bg-card text-card-foreground">
      {/* Header with Actions */}
      <div className="p-3 flex-shrink-0 space-y-3">
        {/* Selection Mode Bar */}
        {isSelectionMode ? (
          <div className="flex items-center justify-between gap-2" role="toolbar" aria-label="Selection actions">
            <div className="flex items-center gap-1 min-w-0">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={exitSelectionMode}
                aria-label="Exit selection mode"
              >
                <X strokeWidth={1.5} aria-hidden="true" />
              </Button>
              <span className="text-label-md text-foreground truncate" aria-live="polite">{selectedIds.size} selected</span>
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={selectAllFiltered}
              >
                <SquareCheck strokeWidth={1.5} aria-hidden="true" />
                All
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleBatchDownload}
                disabled={selectedIds.size === 0}
                title="Download selected"
                aria-label="Download selected"
              >
                <Download strokeWidth={1.5} aria-hidden="true" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={selectedIds.size === 0}
                    title="Delete selected"
                    aria-label="Delete selected"
                  >
                    <Trash2 className="text-destructive" strokeWidth={1.5} aria-hidden="true" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {selectedIds.size} pack(s)?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Selected packs and all their images will be permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className={buttonVariants({ variant: "outline" })}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleBatchDelete}
                      className={buttonVariants({ variant: "danger" })}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-heading-sm text-foreground truncate">Packs</h2>
              <span className="text-caption text-muted-foreground tabular-nums" aria-label={`${filteredPacks.length} packs`}>
                {filteredPacks.length}
              </span>
            </div>

            <div className="flex items-center gap-0.5" role="toolbar" aria-label="Pack actions">
              {packs.length > 0 && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setIsSelectionMode(true)}
                    title="Select packs"
                    aria-label="Select packs"
                  >
                    <Square strokeWidth={1.5} aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={onGenerateAllPacks}
                    disabled={isGeneratingAll}
                    title="Generate all"
                    aria-label="Generate all"
                    aria-busy={isGeneratingAll || undefined}
                  >
                    {isGeneratingAll ? (
                      <Loader2 className="animate-spin" strokeWidth={1.5} aria-hidden="true" />
                    ) : (
                      <Play strokeWidth={1.5} aria-hidden="true" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={onDownloadAllPacks}
                    title="Download all"
                    aria-label="Download all"
                  >
                    <Download strokeWidth={1.5} aria-hidden="true" />
                  </Button>
                </>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onDownloadAllCloudData}
                title="Export cloud data"
                aria-label="Export cloud data"
              >
                <HardDrive strokeWidth={1.5} aria-hidden="true" />
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    title="Delete cloud data"
                    aria-label="Delete cloud data"
                  >
                    <Bomb className="text-destructive" strokeWidth={1.5} aria-hidden="true" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete cloud data?</AlertDialogTitle>
                    <AlertDialogDescription>
                      All packs and images will be permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className={buttonVariants({ variant: "outline" })}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDeleteAllCloudData}
                      className={buttonVariants({ variant: "danger" })}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}

        {/* Gender Filter — segmented control */}
        <div className="space-y-1.5">
          <span className="block text-overline text-muted-foreground" id="pack-gender-filter-label">Gender</span>
          <div
            className="pill-tabs w-full"
            role="group"
            aria-labelledby="pack-gender-filter-label"
          >
            {GENDER_FILTERS.map((filter) => (
              <div key={filter.value} className={`flex-1 flex min-w-0 rounded-full ${genderFilter === filter.value ? 'bg-card' : ''}`}>
                <button
                  type="button"
                  onClick={() => setGenderFilter(filter.value)}
                  aria-pressed={genderFilter === filter.value}
                  className={`pill-tab flex-1 min-w-0 justify-center px-2 truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    filter.value !== "all" && onDownloadPacksByGender ? 'rounded-r-none pr-1' : ''
                  }`}
                >
                  {filter.label}
                </button>
                {filter.value !== "all" && onDownloadPacksByGender && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownloadPacksByGender(filter.value);
                    }}
                    className={`h-[30px] px-1.5 rounded-r-full transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      genderFilter === filter.value
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title={`Download ${filter.label} packs`}
                    aria-label={`Download ${filter.label} packs`}
                  >
                    <Download className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Generation Status Filter — segmented control */}
        <div className="space-y-1.5">
          <span className="block text-overline text-muted-foreground" id="pack-status-filter-label">Status</span>
          <div
            className="pill-tabs w-full"
            role="group"
            aria-labelledby="pack-status-filter-label"
          >
            {GENERATION_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setGenerationFilter(filter.value)}
                aria-pressed={generationFilter === filter.value}
                className="pill-tab flex-1 justify-center px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Upload Component - Always Visible */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <JsonUploader onPacksLoad={onPacksLoad} />
      </div>

      {/* Pack List */}
      <ScrollArea className="flex-1">
        <div className="p-3 pt-1 space-y-0.5">
          {filteredPacks.length === 0 ? (
            <div className="flex flex-col items-center text-center py-8 px-4 gap-2">
              <Sparkles className="size-5 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
              <div className="space-y-1">
                <p className="text-heading-md text-foreground">
                  {packs.length === 0 ? "No packs yet" : "No packs match this filter"}
                </p>
                <p className="text-body-sm text-muted-foreground">
                  {packs.length === 0
                    ? "Upload a JSON pack above to start generating shots."
                    : "Try a different gender or status filter."}
                </p>
              </div>
            </div>
          ) : groupedPacks.length === 1 ? (
            // Single category - no grouping
            groupedPacks[0][1].map(pack => (
              <PackCard
                key={pack.packId}
                pack={pack}
                isSelected={selectedPackId === pack.packId}
                onSelect={() => onSelectPack(pack.packId)}
                onDelete={() => onDeletePack(pack.packId)}
                onDownloadOptimized={onDownloadPackOptimized ? () => onDownloadPackOptimized(pack.packId) : undefined}
                isSelectionMode={isSelectionMode}
                isChecked={selectedIds.has(pack.packId)}
                onToggleCheck={() => toggleSelection(pack.packId)}
              />
            ))
          ) : (
            // Multiple categories - group by category
            groupedPacks.map(([category, categoryPacks]) => (
              <Collapsible
                key={category}
                defaultOpen={true}
                onOpenChange={() => toggleCategory(category)}
              >
                <CollapsibleTrigger className="flex items-center gap-2 w-full h-control-md px-2 rounded-md hover:bg-control transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {expandedCategories.has(category) ? (
                    <ChevronDown className="size-4 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
                  )}
                  {categoryIcons[category] || <Palette className={categoryIconClass} strokeWidth={1.5} aria-hidden="true" />}
                  <span className="text-overline text-muted-foreground">{category}</span>
                  <span className="ml-auto text-caption text-muted-foreground tabular-nums">
                    {categoryPacks.length}
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5 mt-1">
                  {categoryPacks.map(pack => (
                    <PackCard
                      key={pack.packId}
                      pack={pack}
                      isSelected={selectedPackId === pack.packId}
                      onSelect={() => onSelectPack(pack.packId)}
                      onDelete={() => onDeletePack(pack.packId)}
                      onDownloadOptimized={onDownloadPackOptimized ? () => onDownloadPackOptimized(pack.packId) : undefined}
                      isSelectionMode={isSelectionMode}
                      isChecked={selectedIds.has(pack.packId)}
                      onToggleCheck={() => toggleSelection(pack.packId)}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer with Delete All */}
      {packs.length > 0 && !isSelectionMode && (
        <div className="p-3 safe-bottom">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="danger-outline"
                size="sm"
                fullWidth
              >
                <Trash2 strokeWidth={1.5} aria-hidden="true" />
                Delete all packs
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all packs?</AlertDialogTitle>
                <AlertDialogDescription>
                  {packs.length} pack(s) and all images will be deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className={buttonVariants({ variant: "outline" })}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDeleteAllPacks}
                  className={buttonVariants({ variant: "danger" })}
                >
                  Delete all
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
};

// TODO(magnific): PackCard is a clickable div with nested action buttons (role="button" + tabIndex added without a
// keyboard handler per presentation-only rule). Ideally the row itself becomes a <button> and the actions move
// outside it, which requires restructuring the click handlers.
// TODO(magnific): "Delete cloud data" (Bomb) sits in the panel toolbar next to non-destructive actions; conventions
// suggest moving destructive actions into an overflow menu, which requires a DropdownMenu + new handler wiring.
