import { useState, useMemo } from "react";
import { PackFile, getPackId, getPackName, getPackCategory, getPackGender, getPackTags, hasScenes, getSceneCount } from "@/types/pack";
import {
  Briefcase, Palette, Wand2, Film, Clock, Shirt, Plane, Sun, Globe2, GraduationCap,
  Users, User, Sparkles, Upload, Loader2, Trash2, Play, Download, HardDrive, Bomb,
  ChevronDown, ChevronRight, AlertCircle, CheckCircle2, Circle, XCircle
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  isGeneratingAll?: boolean;
}

const categoryIcons: Record<string, React.ReactNode> = {
  photography: <Film className="w-4 h-4" />,
  "3d": <Wand2 className="w-4 h-4" />,
  art: <Palette className="w-4 h-4" />,
  illustration: <Palette className="w-4 h-4" />,
  painting: <Palette className="w-4 h-4" />,
  professional: <Briefcase className="w-4 h-4" />,
  artistic: <Palette className="w-4 h-4" />,
  fantasy: <Wand2 className="w-4 h-4" />,
  cinematic: <Film className="w-4 h-4" />,
  historical: <Clock className="w-4 h-4" />,
  fashion: <Shirt className="w-4 h-4" />,
  travel: <Plane className="w-4 h-4" />,
  seasonal: <Sun className="w-4 h-4" />,
  cultural: <Globe2 className="w-4 h-4" />,
  career: <GraduationCap className="w-4 h-4" />,
  other: <Sparkles className="w-4 h-4" />,
};

const genderIcons: Record<string, React.ReactNode> = {
  male: <User className="w-3 h-3" />,
  female: <User className="w-3 h-3" />,
  any: <Users className="w-3 h-3" />,
  unisex: <Users className="w-3 h-3" />,
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
        <button className="w-full border border-dashed border-border rounded-xl p-2.5 text-center hover:border-primary/50 hover:bg-secondary/30 transition-colors cursor-pointer">
          <Upload className="w-3.5 h-3.5 mx-auto mb-0.5 text-muted-foreground" />
          <p className="text-[10px] text-muted-foreground">Upload JSON</p>
        </button>
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
              setError(null);
            }}
            placeholder='{"package_meta": {...}, "global_render_settings": {...}, "shots": [...]}'
            className="w-full h-48 p-3 text-sm font-mono bg-secondary border-0 rounded-lg focus:ring-2 focus:ring-primary/50 focus:outline-none resize-none"
            disabled={isUploading}
          />
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isUploading}>Cancel</AlertDialogCancel>
          <Button
            onClick={handlePaste}
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
  );
};

// Pack Card Component
const PackCard = ({ 
  pack, 
  isSelected, 
  onSelect, 
  onDelete,
  onDownloadOptimized,
}: { 
  pack: PackInfo; 
  isSelected: boolean; 
  onSelect: () => void; 
  onDelete: () => void;
  onDownloadOptimized?: () => void;
}) => {
  const gender = getPackGender(pack.pack) || "any";
  const packName = getPackName(pack.pack);
  const tags = getPackTags(pack.pack);
  const progress = pack.totalShots > 0 
    ? Math.round((pack.completedShots / pack.totalShots) * 100) 
    : 0;

  const getStatusIcon = () => {
    if (pack.generatingShots > 0) return <Loader2 className="w-2.5 h-2.5 animate-spin text-primary" />;
    if (pack.completedShots === pack.totalShots && pack.totalShots > 0) return <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />;
    if (pack.failedShots > 0) return <XCircle className="w-2.5 h-2.5 text-destructive" />;
    return <Circle className="w-2.5 h-2.5 text-muted-foreground" />;
  };

  return (
    <div
      onClick={onSelect}
      className={`
        group relative p-2.5 rounded-xl cursor-pointer transition-all duration-200
        ${isSelected 
          ? 'bg-primary/10 ring-1 ring-primary shadow-sm' 
          : 'bg-secondary/40 hover:bg-secondary/70'
        }
      `}
    >
      {/* Progress bar */}
      {progress > 0 && progress < 100 && (
        <div 
          className="absolute bottom-0 left-0 h-0.5 bg-primary/40 rounded-b-xl transition-all"
          style={{ width: `${progress}%` }}
        />
      )}

      <div className="flex items-start gap-2">
        <div className="mt-0.5">{getStatusIcon()}</div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-medium truncate">
            {packName || "Unnamed"}
          </h4>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
              {genderIcons[gender] || genderIcons.any}
              {genderLabels[gender] || genderLabels.any}
            </span>
            <span className="text-[9px] text-muted-foreground">
              {pack.completedShots}/{pack.totalShots}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          {/* Download Optimized Button */}
          {pack.completedShots > 0 && onDownloadOptimized && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onDownloadOptimized();
              }}
              title="Download WebP + Original"
            >
              <Download className="w-3 h-3 text-primary" />
            </Button>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="w-3 h-3 text-muted-foreground" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Pack?</AlertDialogTitle>
                <AlertDialogDescription>
                  "{packName}" and all its images will be deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
        <div className="flex flex-wrap gap-1 mt-1.5">
          {tags.slice(0, 2).map((tag, idx) => (
            <span 
              key={idx}
              className="text-[8px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground"
            >
              {tag}
            </span>
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
  isGeneratingAll = false,
}: PackSidebarProps) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");
  const [generationFilter, setGenerationFilter] = useState<GenerationFilter>("all");

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
    <div className="h-full flex flex-col">
      {/* Header with Actions */}
      <div className="p-3 border-b border-border/50 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Packs</h2>
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
              {filteredPacks.length}
            </Badge>
          </div>
          
          <div className="flex gap-0.5">
            {packs.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={onGenerateAllPacks}
                  disabled={isGeneratingAll}
                  title="Generate all"
                >
                  {isGeneratingAll ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Play className="w-3 h-3" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={onDownloadAllPacks}
                  title="Download all"
                >
                  <Download className="w-3 h-3" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onDownloadAllCloudData}
              title="Export cloud data"
            >
              <HardDrive className="w-3 h-3" />
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  title="Delete cloud data"
                >
                  <Bomb className="w-3 h-3 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Cloud Data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    All packs and images will be permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDeleteAllCloudData}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Gender Filter with Download */}
        <div className="flex gap-1 mb-2">
          {GENDER_FILTERS.map((filter) => (
            <div key={filter.value} className="flex-1 flex">
              <button
                onClick={() => setGenderFilter(filter.value)}
                className={`flex-1 px-2 py-1.5 text-[10px] font-medium transition-all ${
                  genderFilter === filter.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
                } ${filter.value !== "all" ? 'rounded-l-lg' : 'rounded-lg'}`}
              >
                {filter.label}
              </button>
              {filter.value !== "all" && onDownloadPacksByGender && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownloadPacksByGender(filter.value);
                  }}
                  className={`px-1.5 py-1.5 text-[10px] rounded-r-lg transition-all border-l ${
                    genderFilter === filter.value
                      ? 'bg-primary/80 text-primary-foreground border-primary-foreground/20 hover:bg-primary/70'
                      : 'bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary'
                  }`}
                  title={`Download ${filter.label} packs`}
                >
                  <Download className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Generation Status Filter */}
        <div className="flex gap-1 mb-3">
          {GENERATION_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setGenerationFilter(filter.value)}
              className={`flex-1 px-2 py-1.5 text-[10px] font-medium rounded-lg transition-all ${
                generationFilter === filter.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Upload Component */}
        <JsonUploader onPacksLoad={onPacksLoad} />
      </div>

      {/* Pack List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {filteredPacks.length === 0 ? (
            <div className="text-center py-8">
              <Sparkles className="w-8 h-8 mx-auto mb-2 text-muted-foreground/20" />
              <p className="text-xs text-muted-foreground">
                {packs.length === 0 ? "No packs yet" : "No packs match this filter"}
              </p>
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
                <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                  {expandedCategories.has(category) ? (
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  )}
                  {categoryIcons[category] || <Palette className="w-4 h-4" />}
                  <span className="text-xs font-medium capitalize">{category}</span>
                  <Badge variant="secondary" className="text-[9px] h-3.5 px-1 ml-auto">
                    {categoryPacks.length}
                  </Badge>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1.5 mt-1.5 ml-5">
                  {categoryPacks.map(pack => (
                    <PackCard
                      key={pack.packId}
                      pack={pack}
                      isSelected={selectedPackId === pack.packId}
                      onSelect={() => onSelectPack(pack.packId)}
                      onDelete={() => onDeletePack(pack.packId)}
                      onDownloadOptimized={onDownloadPackOptimized ? () => onDownloadPackOptimized(pack.packId) : undefined}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer with Delete All */}
      {packs.length > 0 && (
        <div className="p-3 border-t border-border/50">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete All Packs
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete All Packs?</AlertDialogTitle>
                <AlertDialogDescription>
                  {packs.length} pack(s) and all images will be deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDeleteAllPacks}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
};
