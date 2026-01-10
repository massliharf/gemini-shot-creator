import { useState, useMemo } from "react";
import { PackFile, getPackId, getPackName, getPackCategory, getPackGender, getSceneCount } from "@/types/pack";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Play,
  Trash2,
  Download,
  Upload,
  Square,
  SquareCheck,
  Loader2,
  CheckCircle2,
  Circle,
  XCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface PackInfo {
  pack: PackFile;
  packId: string;
  totalShots: number;
  completedShots: number;
  failedShots: number;
  generatingShots: number;
}

type GenderFilter = "all" | "male" | "female";

const GENDER_FILTERS: { value: GenderFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
];

interface PackListProps {
  packs: PackInfo[];
  selectedPackId: string | null;
  onSelectPack: (packId: string) => void;
  onDeletePack: (packId: string) => void;
  onDeleteMultiplePacks?: (packIds: string[]) => void;
  onDownloadMultiplePacks?: (packIds: string[]) => void;
  onGenerateAllPacks?: () => void;
  isGeneratingAll?: boolean;
}

const genderLabels: Record<string, string> = {
  woman_only: "Female",
  man_only: "Male",
  unisex: "Unisex",
  mixed: "Mixed",
  genderless: "Genderless",
  female: "Female",
  male: "Male",
};

// Pack Item Component
const PackItem = ({
  pack,
  isSelected,
  onSelect,
  isSelectionMode,
  isChecked,
  onToggleCheck,
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

  const getStatusIcon = () => {
    if (pack.generatingShots > 0) return <Loader2 className="w-3 h-3 animate-spin text-primary" />;
    if (pack.completedShots === pack.totalShots && pack.totalShots > 0) return <CheckCircle2 className="w-3 h-3 text-green-500" />;
    if (pack.failedShots > 0) return <XCircle className="w-3 h-3 text-destructive" />;
    return <Circle className="w-3 h-3 text-muted-foreground/50" />;
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
      className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
        isSelected && !isSelectionMode
          ? "bg-primary/10 ring-1 ring-primary"
          : isChecked && isSelectionMode
            ? "bg-primary/15 ring-1 ring-primary/50"
            : "hover:bg-secondary/50"
      }`}
    >
      {/* Thumbnail placeholder */}
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
        {isSelectionMode ? (
          <Checkbox
            checked={isChecked}
            onClick={(e) => e.stopPropagation()}
            onCheckedChange={onToggleCheck}
          />
        ) : (
          getStatusIcon()
        )}
      </div>

      {/* Pack Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{packName}</p>
        <p className="text-xs text-muted-foreground">
          {genderLabels[gender] || gender} · {pack.completedShots}/{pack.totalShots} Scenes
        </p>
      </div>
    </div>
  );
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
}: PackListProps) => {
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["photography", "3d", "illustration"]));

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

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
    return packs.filter((pack) => {
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
    filteredPacks.forEach((pack) => {
      const category = getPackCategory(pack.pack);
      if (!groups[category]) groups[category] = [];
      groups[category].push(pack);
    });
    return groups;
  }, [filteredPacks]);

  const categoryOrder = ["photography", "3d", "illustration", "art"];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <h2 className="font-semibold text-sm">Packs ({packs.length})</h2>
      </div>

      {/* Gender Filter Tabs */}
      <div className="p-3 border-b border-border/50">
        <div className="flex bg-secondary/50 rounded-lg p-1">
          {GENDER_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setGenderFilter(filter.value)}
              className={`flex-1 text-xs py-1.5 px-2 rounded-md transition-colors ${
                genderFilter === filter.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action Bar */}
      <div className="p-3 flex items-center gap-1 border-b border-border/50">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg"
          onClick={() => setIsSelectionMode(!isSelectionMode)}
          title={isSelectionMode ? "Exit Selection" : "Select Multiple"}
        >
          {isSelectionMode ? (
            <SquareCheck className="w-4 h-4 text-primary" />
          ) : (
            <Square className="w-4 h-4" />
          )}
        </Button>

        {isSelectionMode ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={handleBatchDownload}
              disabled={selectedIds.size === 0}
              title="Download Selected"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={handleBatchDelete}
              disabled={selectedIds.size === 0}
              title="Delete Selected"
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={onGenerateAllPacks}
              disabled={isGeneratingAll || packs.length === 0}
              title="Generate All"
            >
              {isGeneratingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              title="Delete All"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              title="Upload"
            >
              <Upload className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>

      {/* Pack List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {categoryOrder.map((category) => {
            const categoryPacks = groupedPacks[category];
            if (!categoryPacks || categoryPacks.length === 0) return null;

            const isExpanded = expandedCategories.has(category);

            return (
              <Collapsible
                key={category}
                open={isExpanded}
                onOpenChange={() => toggleCategory(category)}
              >
                <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </CollapsibleTrigger>

                <CollapsibleContent className="space-y-1 mt-1">
                  {categoryPacks.map((pack) => (
                    <PackItem
                      key={pack.packId}
                      pack={pack}
                      isSelected={selectedPackId === pack.packId}
                      onSelect={() => onSelectPack(pack.packId)}
                      isSelectionMode={isSelectionMode}
                      isChecked={selectedIds.has(pack.packId)}
                      onToggleCheck={() => toggleSelection(pack.packId)}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
