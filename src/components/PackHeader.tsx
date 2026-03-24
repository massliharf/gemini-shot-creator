import { PackFile, getPackName, getPackCategory, getPackGender, getSceneCount } from "@/types/pack";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2, Download } from "lucide-react";
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
    <div className="flex items-center gap-4 px-5 py-3 border-b border-border/40">
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold truncate">{packName}</h1>
        <p className="text-xs text-muted-foreground">
          {category.charAt(0).toUpperCase() + category.slice(1)} · {genderLabels[gender] || gender} · {completedCount}/{sceneCount}
        </p>
      </div>

      <div className="flex items-center gap-0.5">
        {onRegenerate && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={onRegenerate}
            disabled={isGenerating}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
          </Button>
        )}

        {onDownload && completedCount > 0 && (
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={onDownload}>
            <Download className="w-3.5 h-3.5" />
          </Button>
        )}

        {onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-base">Delete Pack?</AlertDialogTitle>
                <AlertDialogDescription className="text-sm">
                  "{packName}" and all its images will be permanently deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
};
