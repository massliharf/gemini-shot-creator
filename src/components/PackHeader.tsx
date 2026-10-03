import { PackFile, getPackName, getPackCategory, getPackGender, getSceneCount } from "@/types/pack";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCw, Trash2, Download, CheckCircle2, Tag, User } from "lucide-react";
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

export const PackHeader = ({
  pack,
  completedCount,
  onRegenerate,
  onDelete,
  onDownload,
  isGenerating,
}: PackHeaderProps) => {
  const packName = getPackName(pack);
  const category = getPackCategory(pack);
  const gender = getPackGender(pack);
  const sceneCount = getSceneCount(pack);

  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4 px-4 md:px-8 pt-4 pb-3 bg-background">
      <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-heading-md truncate">{packName}</h1>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge>
            <Tag strokeWidth={1.5} aria-hidden="true" />
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </Badge>
          <Badge>
            <User strokeWidth={1.5} aria-hidden="true" />
            {genderLabels[gender] || gender}
          </Badge>
          <Badge variant={completedCount > 0 && completedCount === sceneCount ? "success" : "default"}>
            <CheckCircle2 strokeWidth={1.5} aria-hidden="true" />
            {completedCount}/{sceneCount} done
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap md:flex-nowrap md:justify-end">
        {onDownload && completedCount > 0 && (
          <Button variant="outline" size="lg" className="md:h-control-md md:text-label-md flex-1 md:flex-none" onClick={onDownload}>
            <Download strokeWidth={1.5} aria-hidden="true" />
            Download ZIP
          </Button>
        )}

        {onRegenerate && (
          <Button
            variant="outline"
            size="lg"
            className="md:h-control-md md:text-label-md flex-1 md:flex-none"
            onClick={onRegenerate}
            disabled={isGenerating}
            aria-busy={isGenerating || undefined}
          >
            <RefreshCw className={isGenerating ? "animate-spin" : ""} strokeWidth={1.5} aria-hidden="true" />
            Regenerate all
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
                    className="h-control-lg w-control-lg md:h-control-md md:w-control-md text-muted-foreground hover:text-destructive hover:bg-danger-bg"
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
    </header>
  );
};

// TODO(magnific): "Regenerate all" and "Download ZIP" are both `outline` because the floating BottomBar "Generate" is the screen's single black primary (§4 "one primary per screen").
// TODO(magnific): Regenerate-all should ideally reuse RegenerateConfirmDialog when images exist; that needs new state, so it is left as-is.
