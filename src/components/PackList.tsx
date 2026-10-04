import { useState, useMemo } from "react";
import { PackFile, getPackName, getPackCategory, getPackGender } from "@/types/pack";
import { Button, buttonVariants } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Play, Trash2, Download, Upload, Square, SquareCheck, Loader2, Plus, Layers } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { isDemoMode } from "@/lib/demo";
import { SampleChip } from "@/components/SampleNotice";
import { PackThumb } from "@/components/packs/PackThumb";
import { PackUploadDialog } from "@/components/packs/PackUploadDialog";

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
  const total = pack.totalShots;
  const done = pack.completedShots;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const isComplete = total > 0 && done === total;
  const isWorking = pack.generatingShots > 0;
  const genderLabel = genderLabels[gender] || gender;
  return <li>
      <div
        role="button"
        tabIndex={0}
        aria-pressed={isActive || undefined}
        aria-label={`${packName}, ${done} of ${total} scenes generated`}
        data-active={isActive || undefined}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        className="nav-item group/pack items-center gap-2.5 px-2 py-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
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

      {/* Thumbnail: first generated image, or a tinted initial */}
      <PackThumb name={packName} src={pack.thumbnailUrl} className="size-9" />

      {/* Name + progress */}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="truncate text-label-md text-foreground">{packName}</span>
          {isWorking && <Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" strokeWidth={2} aria-hidden="true" />}
        </span>
        <span className="flex items-center gap-2">
          <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-track" aria-hidden="true">
            <span
              className={cn(
                "absolute inset-y-0 left-0 rounded-full transition-[width] duration-normal ease-standard",
                isComplete ? "bg-success" : "bg-foreground",
              )}
              style={{ width: `${percent}%` }}
            />
          </span>
          <span className="text-caption text-tertiary-foreground shrink-0 tabular-nums whitespace-nowrap">
            {done}/{total}
            {pack.failedShots > 0 && <span className="text-destructive"> · {pack.failedShots} failed</span>}
          </span>
        </span>
      </span>
      <span className="sr-only">{genderLabel}</span>
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

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const demo = isDemoMode();

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
          {demo && packs.length > 0 && <SampleChip className="self-center" />}
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className={toolbarIconButtonClass} aria-label="Upload JSON" disabled={!onPacksLoad} onClick={() => setIsUploadOpen(true)}>
                  <Upload strokeWidth={1.5} aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Upload JSON</TooltipContent>
            </Tooltip>
          </>}
      </div>

      <PackUploadDialog open={isUploadOpen} onOpenChange={setIsUploadOpen} onPacksLoad={onPacksLoad} />

      {/* Pack List */}
      <ScrollArea className="flex-1 min-h-0 overscroll-contain">
        <div className="px-2 pb-3 space-y-4">
          {packs.length === 0 ? (
            <div className="mx-1 mt-1 flex flex-col items-center gap-1.5 rounded-md bg-app px-4 py-8 text-center">
              <Layers className="size-5 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
              <p className="text-label-md text-foreground">No packs yet</p>
              <p className="text-caption text-muted-foreground">Upload a pack JSON or build one in Pack Creator.</p>
            </div>
          ) : filteredPacks.length === 0 ? (
            <p className="px-2 py-6 text-center text-caption text-muted-foreground" role="status">
              No {genderFilter} packs.
            </p>
          ) : null}
          {categoryOrder.map(category => {
          const categoryPacks = groupedPacks[category];
          if (!categoryPacks || categoryPacks.length === 0) return null;
          return <section key={category} aria-labelledby={`pack-category-${category}`}>
                <h3 id={`pack-category-${category}`} className="flex items-center justify-between text-overline text-muted-foreground mb-1 px-2">
                  <span>{category.charAt(0).toUpperCase() + category.slice(1)}</span>
                  <span className="tabular-nums text-tertiary-foreground">{categoryPacks.length}</span>
                </h3>
                <ul className="space-y-0.5" role="list">
                  {categoryPacks.map(pack => <PackItem key={pack.packId} pack={pack} isSelected={selectedPackId === pack.packId} onSelect={() => onSelectPack(pack.packId)} isSelectionMode={isSelectionMode} isChecked={selectedIds.has(pack.packId)} onToggleCheck={() => toggleSelection(pack.packId)} />)}
                </ul>
              </section>;
        })}
        </div>
      </ScrollArea>
    </div>;
};

// TODO(magnific): "Generate all" is an icon button in a toolbar; the Magnific pattern would prefer one visible primary button, but promoting it changes toolbar structure semantics beyond presentation.
