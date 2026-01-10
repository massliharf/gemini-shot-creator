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
    <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-lg font-semibold">{packName}</h1>
          <p className="text-sm text-muted-foreground">
            {category.charAt(0).toUpperCase() + category.slice(1)} · {genderLabels[gender] || gender} · {sceneCount} Scenes
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onRegenerate && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg"
            onClick={onRegenerate}
            disabled={isGenerating}
            title="Regenerate All"
          >
            <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          </Button>
        )}

        {onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg"
                title="Delete Pack"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Pack?</AlertDialogTitle>
                <AlertDialogDescription>
                  "{packName}" and all its images will be permanently deleted.
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
        )}

        {onDownload && completedCount > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg"
            onClick={onDownload}
            title="Download Pack"
          >
            <Download className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
