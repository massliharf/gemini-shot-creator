import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface RegenerateConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  sceneId?: string | number;
  isRegeneratingAll?: boolean;
}

export const RegenerateConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  sceneId,
  isRegeneratingAll = false,
}: RegenerateConfirmDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <AlertDialogTitle>
              {isRegeneratingAll ? "Regenerate All Scenes?" : `Regenerate Scene #${sceneId}?`}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            {isRegeneratingAll ? (
              <>
                This will regenerate <strong>all completed scenes</strong> in this pack.
                This action will consume API credits and cannot be undone.
              </>
            ) : (
              <>
                This scene already has a generated image. Regenerating will replace it 
                and consume additional API credits.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-amber-600 hover:bg-amber-700"
          >
            Yes, Regenerate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
