import { useState, useMemo } from "react";
import { PackFile, getPackId, getPackName, getPackCategory, getPackGender, getSceneCount, hasScenes } from "@/types/pack";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { SmartImage } from "@/components/SmartImage";
import { Play, Trash2, Download, Upload, Square, SquareCheck, Loader2, CheckCircle2, Circle, XCircle, Image as ImageIcon, AlertCircle, Plus } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
  return <div onClick={handleClick} className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all ${isSelected && !isSelectionMode ? "bg-secondary" : isChecked && isSelectionMode ? "bg-secondary" : "hover:bg-secondary/50"}`}>
      {/* Thumbnail */}
      <div className="w-11 h-11 rounded-lg bg-muted overflow-hidden flex-shrink-0 relative">
        {pack.thumbnailUrl ? (
          <SmartImage
            src={pack.thumbnailUrl}
            alt={packName}
            fit="cover"
            loading="lazy"
            className="w-full h-full"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
          </div>
        )}
        
        {/* Selection checkbox overlay */}
        {isSelectionMode && <div className="absolute inset-0 bg-foreground/30 flex items-center justify-center">
            <Checkbox checked={isChecked} onClick={e => e.stopPropagation()} onCheckedChange={onToggleCheck} className="border-background data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
          </div>}
      </div>

      {/* Pack Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{packName}</p>
        <p className="text-xs text-muted-foreground">
          {genderLabels[gender] || gender} · {pack.totalShots} Scenes
        </p>
      </div>
    </div>;
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
  onPacksLoad
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
  return <div className="h-full min-h-0 flex flex-col bg-background border-r border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4">
        <h2 className="font-semibold">Packs ({packs.length})</h2>
      </div>

      {/* Gender Filter Tabs */}
      <div className="px-4 pb-3">
        <div className="flex bg-muted p-1 rounded-full">
          {GENDER_FILTERS.map(filter => <button key={filter.value} onClick={() => setGenderFilter(filter.value)} className={`flex-1 text-sm py-1.5 px-3 rounded-md transition-colors font-medium ${genderFilter === filter.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {filter.label}
            </button>)}
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-4 pb-3 flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => setIsSelectionMode(!isSelectionMode)} title={isSelectionMode ? "Exit Selection" : "Select Multiple"}>
          {isSelectionMode ? <SquareCheck className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
        </Button>

        {isSelectionMode ? <>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={handleBatchDownload} disabled={selectedIds.size === 0} title="Download Selected">
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={handleBatchDelete} disabled={selectedIds.size === 0} title="Delete Selected">
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </> : <>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={onGenerateAllPacks} disabled={isGeneratingAll || packs.length === 0} title="Generate All">
              {isGeneratingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" title="Delete All">
              <Trash2 className="w-4 h-4" />
            </Button>
            <AlertDialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" title="Upload JSON" disabled={!onPacksLoad}>
                  <Upload className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-lg">
                <AlertDialogHeader>
                  <AlertDialogTitle>Paste JSON Pack</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm">
                    Paste your JSON pack content below.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                
                <div className="space-y-3">
                  <textarea
                    value={jsonText}
                    onChange={(e) => {
                      setJsonText(e.target.value);
                      setUploadError(null);
                    }}
                    placeholder='{"package_meta": {...}, "global_render_settings": {...}, "shots": [...]}'
                    className="w-full h-48 p-3 text-sm font-mono bg-secondary border-0 rounded-lg focus:ring-2 focus:ring-primary/50 focus:outline-none resize-none"
                    disabled={isUploading}
                  />
                  {uploadError && (
                    <div className="flex items-center gap-2 text-destructive text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>{uploadError}</span>
                    </div>
                  )}
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isUploading}>Cancel</AlertDialogCancel>
                  <Button
                    onClick={handleJsonUpload}
                    disabled={isUploading || !jsonText.trim()}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      "Upload"
                    )}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>}
      </div>

      {/* Pack List */}
      <ScrollArea className="flex-1 min-h-0 overscroll-contain">
        <div className="px-3 pb-3 space-y-4">
          {categoryOrder.map(category => {
          const categoryPacks = groupedPacks[category];
          if (!categoryPacks || categoryPacks.length === 0) return null;
          return <div key={category}>
                <h3 className="text-xs font-medium text-muted-foreground mb-2 px-1">
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </h3>
                <div className="space-y-1">
                  {categoryPacks.map(pack => <PackItem key={pack.packId} pack={pack} isSelected={selectedPackId === pack.packId} onSelect={() => onSelectPack(pack.packId)} isSelectionMode={isSelectionMode} isChecked={selectedIds.has(pack.packId)} onToggleCheck={() => toggleSelection(pack.packId)} />)}
                </div>
              </div>;
        })}
        </div>
      </ScrollArea>
    </div>;
};