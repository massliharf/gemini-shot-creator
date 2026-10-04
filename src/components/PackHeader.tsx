import { PackFile, getPackName, getPackCategory, getPackGender, getSceneCount, getPackDescription, getPackTags } from "@/types/pack";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCw, Trash2, Download, Tag, User, Layers, Hash, Sparkles } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface PackHeaderProps {
  pack: PackFile;
  completedCount: number;
  onRegenerate?: () => void;
  onDelete?: () => void;
  onDownload?: () => void;
  isGenerating?: boolean;
}

const genderLabels: Record<string, string> = {
  woman_only: "Female",
  man_only: "Male",
  unisex: "Unisex",
  mixed: "Mixed",
  genderless: "Genderless",
};

const MAX_TAGS = 3;

export const PackHeader = ({
  pack,
  completedCount,
  onRegenerate,
  onDelete,
  onDownload,
  isGenerating,
}: PackHeaderProps) => {
  const packName = getPackName(pack);
  const description = getPackDescription(pack);
  const category = getPackCategory(pack);
  const gender = getPackGender(pack);
  const sceneCount = getSceneCount(pack);
  const tags = getPackTags(pack);
  const percent = sceneCount > 0 ? Math.round((completedCount / sceneCount) * 100) : 0;
  const isComplete = sceneCount > 0 && completedCount === sceneCount;
  const hasImages = completedCount > 0;

  return (
    <header className="flex flex-col gap-4 px-4 md:px-8 pt-5 md:pt-6 pb-4 bg-background lg:flex-row lg:items-start lg:justify-between lg:gap-8">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="min-w-0">
          <h1 className="text-heading-md text-foreground truncate">{packName}</h1>
          {description && (
            <p className="text-body-sm text-muted-foreground line-clamp-2 md:line-clamp-1 max-w-[72ch]">{description}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5" aria-label="Pack details">
          <Badge>
            <Tag strokeWidth={1.5} aria-hidden="true" />
            {category === "3d" ? "3D" : category.charAt(0).toUpperCase() + category.slice(1)}
          </Badge>
          <Badge>
            <User strokeWidth={1.5} aria-hidden="true" />
            {genderLabels[gender] || gender}
          </Badge>
          <Badge>
            <Layers strokeWidth={1.5} aria-hidden="true" />
            <span className="tabular-nums">{sceneCount}</span> scenes
          </Badge>
          {tags.slice(0, MAX_TAGS).map((tag) => (
            <Badge key={tag} variant="secondary">
              <Hash strokeWidth={1.5} aria-hidden="true" />
              {tag}
            </Badge>
          ))}
          {tags.length > MAX_TAGS && (
            <Badge variant="secondary" title={tags.slice(MAX_TAGS).join(", ")}>
              +{tags.length - MAX_TAGS}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 lg:items-end shrink-0">
        <div className="flex items-center gap-2">
          {onDownload && (
            <Button
              variant="outline"
              className="h-control-lg md:h-control-md flex-1 lg:flex-none"
              onClick={onDownload}
              disabled={!hasImages}
            >
              <Download strokeWidth={1.5} aria-hidden="true" />
              Download ZIP
            </Button>
          )}

          {onRegenerate && (
            <Button
              variant="outline"
              className="h-control-lg md:h-control-md flex-1 lg:flex-none"
              onClick={onRegenerate}
              disabled={isGenerating}
              aria-busy={isGenerating || undefined}
            >
              {hasImages ? (
                <RefreshCw className={isGenerating ? "animate-spin" : ""} strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <Sparkles strokeWidth={1.5} aria-hidden="true" />
              )}
              {isGenerating ? "Generating..." : hasImages ? "Regenerate" : "Generate pack"}
            </Button>
          )}

          {onDelete && (
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-control-lg w-control-lg md:h-control-md md:w-control-md shrink-0 text-muted-foreground hover:text-destructive hover:bg-danger-bg"
                      aria-label="Delete pack"
                    >
                      <Trash2 strokeWidth={1.5} aria-hidden="true" />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Delete pack</TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete pack?</AlertDialogTitle>
                  <AlertDialogDescription>
                    "{packName}" and all its images will be permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className={buttonVariants({ variant: "danger" })}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 lg:w-full lg:min-w-[220px]">
          <div
            className="relative h-1 flex-1 overflow-hidden rounded-full bg-track"
            role="progressbar"
            aria-label="Scenes generated"
            aria-valuemin={0}
            aria-valuemax={sceneCount}
            aria-valuenow={completedCount}
          >
            <div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full transition-[width] duration-normal ease-standard",
                isComplete ? "bg-success" : "bg-foreground",
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className={cn("text-caption tabular-nums whitespace-nowrap", isComplete ? "text-success-text" : "text-muted-foreground")}>
            {completedCount}/{sceneCount} generated
          </span>
        </div>
      </div>
    </header>
  );
};
