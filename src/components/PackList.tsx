import { useState, useMemo } from "react";
import { PackFile, getPackId, getPackName, getPackCategory, getPackGender, getSceneCount, hasScenes } from "@/types/pack";
import { Button, buttonVariants } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SmartImage } from "@/components/SmartImage";
import { Play, Trash2, Download, Upload, Square, SquareCheck, Loader2, CheckCircle2, Circle, XCircle, Image as ImageIcon, Plus } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export type PacksLoadResult = {
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
  thumbnailUrl?: string;
}
type GenderFilter = "all" | "male" | "female";
const GENDER_FILTERS: {
  value: GenderFilter;
  label: string;
}[] = [{
  value: "all",
  label: "All"
}, {
  value: "female",
  label: "Female"
}, {
  value: "male",
  label: "Male"
}];
interface PackListProps {
  packs: PackInfo[];
  selectedPackId: string | null;
  onSelectPack: (packId: string) => void;
  onDeletePack: (packId: string) => void;
  onDeleteMultiplePacks?: (packIds: string[]) => void;
  onDownloadMultiplePacks?: (packIds: string[]) => void;
  onGenerateAllPacks?: () => void;
  isGeneratingAll?: boolean;
  onPacksLoad?: (packs: PackFile[]) => Promise<PacksLoadResult>;
  onOpenTextGen?: () => void;
}
const genderLabels: Record<string, string> = {
  woman_only: "Female",
  man_only: "Male",
  unisex: "Unisex",
  mixed: "Mixed",
  genderless: "Genderless",
  female: "Female",
  male: "Male"
};

// Pack Item Component
const PackItem = ({
  pack,
  isSelected,
  onSelect,
  isSelectionMode,
  isChecked,
  onToggleCheck
}: {
  pack: PackInfo;
  isSelected: boolean;
  onSelect: () => void;
  isSelectionMode?: boolean;
  isChecked?: boolean;
  onToggleCheck?: () => void;
}) => {
  const packName = getPackName(pack.pack);
  const gender = getPackGender(pack.pack);
  const handleClick = () => {
    if (isSelectionMode && onToggleCheck) {
      onToggleCheck();
    } else {
      onSelect();
    }
  };
  const isActive = (isSelected && !isSelectionMode) || (isChecked && isSelectionMode);
  return <li>
      <div
        role="button"
        tabIndex={0}
        aria-pressed={isActive || undefined}
        data-active={isActive || undefined}
        onClick={handleClick}
        className="nav-item min-h-touch md:min-h-control-md px-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
      >
      {/* Selection checkbox (selection mode only) */}
      {isSelectionMode && (
        <Checkbox
          checked={isChecked}
          onClick={e => e.stopPropagation()}
          onCheckedChange={onToggleCheck}
          aria-label={`Select ${packName}`}
          className="shrink-0"
        />
      )}

      {/* Thumbnail */}
      <div className="size-6 rounded-xs bg-control overflow-hidden flex-shrink-0 relative">
        {pack.thumbnailUrl ? (
          <SmartImage
            src={pack.thumbnailUrl}
            alt=""
            fit="cover"
            loading="lazy"
            className="w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" aria-hidden="true">
            <ImageIcon className="size-3.5 text-tertiary-foreground" strokeWidth={1.5} />
          </div>
        )}
      </div>

      {/* Pack Info */}
      <span className="flex-1 min-w-0 truncate">{packName}</span>
      <span className="text-caption text-tertiary-foreground shrink-0 tabular-nums whitespace-nowrap">
        {genderLabels[gender] || gender} · {pack.totalShots}
      </span>
      </div>
    </li>;
};
export const PackList = ({
  packs,
  selectedPackId,
  onSelectPack,
  onDeletePack,
  onDeleteMultiplePacks,
  onDownloadMultiplePacks,
  onGenerateAllPacks,
  isGeneratingAll = false,
  onPacksLoad,
  onOpenTextGen,
}: PackListProps) => {
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // JSON Upload state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleJsonUpload = async () => {
    if (!jsonText.trim() || !onPacksLoad) {
      setUploadError("Please paste JSON content");
      return;
    }

    const extractJsonSlice = (raw: string) => {
      let s = raw.trim();
      if (s.startsWith("```json")) s = s.slice(7);
      else if (s.startsWith("```")) s = s.slice(3);
      if (s.endsWith("```")) s = s.slice(0, -3);
      s = s.trim();
      const firstCurly = s.indexOf("{");
      const firstSquare = s.indexOf("[");
      const start = firstCurly === -1 ? firstSquare : firstSquare === -1 ? firstCurly : Math.min(firstCurly, firstSquare);
      if (start === -1) return s;
      const lastCurly = s.lastIndexOf("}");
      const lastSquare = s.lastIndexOf("]");
      const end = Math.max(lastCurly, lastSquare);
      if (end === -1 || end <= start) return s.slice(start);
      return s.slice(start, end + 1);
    };

    const normalizeToPacks = (parsed: any): PackFile[] => {
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        if (parsed.pack && typeof parsed.pack === "object") return [parsed.pack as PackFile];
        if (Array.isArray(parsed.packs)) return parsed.packs as PackFile[];
        if (Array.isArray(parsed.data)) return parsed.data as PackFile[];
        if (parsed.data && typeof parsed.data === "object") {
          if (parsed.data.pack) return [parsed.data.pack as PackFile];
          if (Array.isArray(parsed.data.packs)) return parsed.data.packs as PackFile[];
        }
      }
      if (Array.isArray(parsed)) return parsed as PackFile[];
      return [parsed as PackFile];
    };

    setIsUploading(true);
    setUploadError(null);

    try {
      const slice = extractJsonSlice(jsonText);
      const parsed = JSON.parse(slice);
      const packsToUpload = normalizeToPacks(parsed);

      for (const pack of packsToUpload) {
        const packId = getPackId(pack);
        const packName = getPackName(pack);
        if (!packId || !packName) {
          setUploadError("Invalid JSON: missing pack_id or package_name");
          setIsUploading(false);
          return;
        }
        if (!hasScenes(pack)) {
          setUploadError("Invalid JSON: missing or empty scenes array");
          setIsUploading(false);
          return;
        }
      }

      const result = await onPacksLoad(packsToUpload);
      if (result.uploadedCount > 0) {
        setJsonText("");
        setIsUploadOpen(false);
        toast.success(`${result.uploadedCount} pack(s) uploaded`);
      }
      if (result.failed.length > 0) {
        setUploadError(`${result.failed.length} pack(s) failed`);
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        setUploadError("Invalid JSON syntax");
      } else {
        setUploadError(err instanceof Error ? err.message : "Upload failed");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
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

  // Filter packs
  const filteredPacks = useMemo(() => {
    return packs.filter(pack => {
      if (genderFilter === "all") return true;
      const gender = getPackGender(pack.pack);
      if (genderFilter === "female") return gender === "woman_only" || gender === "female";
      if (genderFilter === "male") return gender === "man_only" || gender === "male";
      return true;
    });
  }, [packs, genderFilter]);

  // Group by category
  const groupedPacks = useMemo(() => {
    const groups: Record<string, PackInfo[]> = {};
    filteredPacks.forEach(pack => {
      const category = getPackCategory(pack.pack);
      if (!groups[category]) groups[category] = [];
      groups[category].push(pack);
    });
    return groups;
  }, [filteredPacks]);

  // Dynamic category order - includes all categories from packs
  const categoryOrder = useMemo(() => {
    const allCategories = Object.keys(groupedPacks);
    const knownOrder = ["photography", "3d", "illustration", "art"];
    const sorted = knownOrder.filter(c => allCategories.includes(c));
    const custom = allCategories.filter(c => !knownOrder.includes(c)).sort();
    return [...sorted, ...custom];
  }, [groupedPacks]);

  const toolbarIconButtonClass = "h-control-lg w-control-lg md:h-control-md md:w-control-md text-muted-foreground hover:text-foreground";
    return <div className="h-full min-h-0 flex flex-col bg-card text-card-foreground overflow-hidden">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <h2 className="text-heading-sm truncate">Packs</h2>
          <span className="text-caption text-muted-foreground tabular-nums" aria-label={`${packs.length} packs`}>{packs.length}</span>
        </div>
        {onOpenTextGen && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className={toolbarIconButtonClass} onClick={onOpenTextGen} aria-label="Text to image">
                <Plus strokeWidth={1.5} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Text to image</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Gender Filter Tabs */}
      <div className="px-3 pb-2">
        <div className="pill-tabs w-full" role="group" aria-label="Filter packs by gender">
          {GENDER_FILTERS.map(filter => <button
              key={filter.value}
              type="button"
              aria-pressed={genderFilter === filter.value}
              onClick={() => setGenderFilter(filter.value)}
              className="pill-tab flex-1 justify-center px-2 min-h-touch md:min-h-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {filter.label}
            </button>)}
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-3 pb-2 flex items-center gap-0.5 flex-wrap" role="toolbar" aria-label="Pack actions">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`${toolbarIconButtonClass} aria-pressed:bg-active aria-pressed:text-foreground`}
              onClick={() => setIsSelectionMode(!isSelectionMode)}
              aria-label={isSelectionMode ? "Exit selection" : "Select multiple"}
              aria-pressed={isSelectionMode}
            >
              {isSelectionMode ? <SquareCheck strokeWidth={1.5} aria-hidden="true" /> : <Square strokeWidth={1.5} aria-hidden="true" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isSelectionMode ? "Exit selection" : "Select multiple"}</TooltipContent>
        </Tooltip>

        {isSelectionMode ? <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className={toolbarIconButtonClass} onClick={handleBatchDownload} disabled={selectedIds.size === 0} aria-label="Download selected">
                  <Download strokeWidth={1.5} aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download selected</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className={`${toolbarIconButtonClass} hover:text-destructive hover:bg-danger-bg`} onClick={handleBatchDelete} disabled={selectedIds.size === 0} aria-label="Delete selected">
                  <Trash2 strokeWidth={1.5} aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete selected</TooltipContent>
            </Tooltip>
            {selectedIds.size > 0 && (
              <span className="ml-1 text-caption text-muted-foreground" aria-live="polite">{selectedIds.size} selected</span>
            )}
          </> : <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className={toolbarIconButtonClass} onClick={onGenerateAllPacks} disabled={isGeneratingAll || packs.length === 0} aria-label="Generate all" aria-busy={isGeneratingAll || undefined}>
                  {isGeneratingAll ? <Loader2 className="animate-spin" strokeWidth={1.5} aria-hidden="true" /> : <Play strokeWidth={1.5} aria-hidden="true" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Generate all</TooltipContent>
            </Tooltip>
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className={toolbarIconButtonClass} aria-label="Delete all" disabled={packs.length === 0}>
                      <Trash2 strokeWidth={1.5} aria-hidden="true" />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Delete all</TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete all packs?</AlertDialogTitle>
                  <AlertDialogDescription>
                    All {packs.length} packs and their generated images will be permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDeleteMultiplePacks?.(packs.map(p => p.packId))}
                    className={buttonVariants({ variant: "danger" })}
                  >
                    Delete all
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className={toolbarIconButtonClass} aria-label="Upload JSON" disabled={!onPacksLoad}>
                      <Upload strokeWidth={1.5} aria-hidden="true" />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Upload JSON</TooltipContent>
              </Tooltip>
              <AlertDialogContent className="max-w-lg">
                <AlertDialogHeader>
                  <AlertDialogTitle>Paste JSON pack</AlertDialogTitle>
                  <AlertDialogDescription>
                    Paste your JSON pack content below.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-3">
                  <label htmlFor="pack-json-input" className="sr-only">JSON pack content</label>
                  <textarea
                    id="pack-json-input"
                    value={jsonText}
                    onChange={(e) => {
                      setJsonText(e.target.value);
                      setUploadError(null);
                    }}
                    placeholder='{"package_meta": {...}, "global_render_settings": {...}, "shots": [...]}'
                    className="w-full h-48 p-3 text-code font-mono bg-card text-foreground placeholder:text-tertiary-foreground rounded-md border border-border transition-colors duration-fast ease-standard hover:border-border-strong focus-visible:outline-none focus-visible:border-ring aria-[invalid=true]:border-destructive disabled:cursor-not-allowed disabled:text-tertiary-foreground resize-none"
                    disabled={isUploading}
                    aria-invalid={uploadError ? true : undefined}
                    aria-describedby={uploadError ? "pack-json-error" : undefined}
                  />
                  {uploadError && (
                    <div id="pack-json-error" role="alert" className="flex items-center gap-2 text-destructive text-body-sm">
                      <XCircle className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                      <span>{uploadError}</span>
                    </div>
                  )}
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isUploading}>Cancel</AlertDialogCancel>
                  <Button
                    variant="primary"
                    onClick={handleJsonUpload}
                    disabled={isUploading || !jsonText.trim()}
                    loading={isUploading}
                  >
                    {isUploading ? "Uploading..." : "Upload"}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>}
      </div>

      {/* Pack List */}
      <ScrollArea className="flex-1 min-h-0 overscroll-contain">
        <div className="px-2 pb-3 space-y-4">
          {categoryOrder.map(category => {
          const categoryPacks = groupedPacks[category];
          if (!categoryPacks || categoryPacks.length === 0) return null;
          return <section key={category} aria-labelledby={`pack-category-${category}`}>
                <h3 id={`pack-category-${category}`} className="text-overline text-muted-foreground mb-1 px-2">
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </h3>
                <ul className="space-y-px" role="list">
                  {categoryPacks.map(pack => <PackItem key={pack.packId} pack={pack} isSelected={selectedPackId === pack.packId} onSelect={() => onSelectPack(pack.packId)} isSelectionMode={isSelectionMode} isChecked={selectedIds.has(pack.packId)} onToggleCheck={() => toggleSelection(pack.packId)} />)}
                </ul>
              </section>;
        })}
        </div>
      </ScrollArea>
    </div>;
};

// TODO(magnific): PackItem row is a clickable div (role="button" tabIndex=0) — adding keyboard Enter/Space activation requires a new handler, left for a logic pass.
// TODO(magnific): "Generate all" is an icon button in a toolbar; the Magnific pattern would prefer one visible primary button, but promoting it changes toolbar structure semantics beyond presentation.
