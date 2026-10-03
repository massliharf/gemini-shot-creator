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
          <AlertDialogTitle>
            {isRegeneratingAll ? "Regenerate all scenes?" : `Regenerate scene #${sceneId}?`}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-body-sm">
            {isRegeneratingAll ? (
              <>
                This will regenerate <strong className="font-medium text-foreground">all completed scenes</strong> in this pack.
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
          <AlertDialogAction onClick={onConfirm}>
            Yes, regenerate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
