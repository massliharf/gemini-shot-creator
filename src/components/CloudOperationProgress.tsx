import { Progress } from "@/components/ui/progress";
import { Loader2, Download, Trash2, CheckCircle, Pause, Play } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface CloudOperationState {
  isActive: boolean;
  type: "export" | "delete" | null;
  phase: string;
  currentItem: number;
  totalItems: number;
  currentFile?: string;
  downloadUrl?: string;
  downloadFilename?: string;
  /** When true, export is waiting for user's confirmation to continue (e.g. per-batch export). */
  awaitingConfirm?: boolean;
  isPaused?: boolean;
}

interface CloudOperationProgressProps {
  state: CloudOperationState;
  onClose?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onConfirmContinue?: () => void;
}

export const CloudOperationProgress = ({
  state,
  onClose,
  onPause,
  onResume,
  onConfirmContinue,
}: CloudOperationProgressProps) => {
  if (!state.isActive) return null;

  const progress = state.totalItems > 0
    ? Math.round((state.currentItem / state.totalItems) * 100)
    : 0;

  const isDownloadReady = Boolean(state.downloadUrl);
  const Icon = state.type === "export" ? Download : Trash2;
  const title = state.type === "export" ? "Exporting Cloud Data" : "Deleting Cloud Data";

  return (
    <Dialog
      open={state.isActive}
      onOpenChange={(open) => {
        if (!open) {
          // During per-batch exports we require an explicit confirmation before continuing.
          if (state.awaitingConfirm) return;
          onClose?.();
        }
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => {
          if (!isDownloadReady || state.awaitingConfirm) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {state.type === "export"
              ? "Exporting all your data from the cloud. Please wait…"
              : "Removing all your data from the cloud. This cannot be undone."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3">
            {isDownloadReady ? (
              <CheckCircle className="w-5 h-5 text-primary" />
            ) : state.isPaused ? (
              <Pause className="w-5 h-5 text-yellow-500" />
            ) : (
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            )}
            <span className="text-sm text-muted-foreground">
              {state.isPaused ? "Duraklatıldı - Devam etmek için butona tıklayın" : state.phase}
            </span>
          </div>

          {!isDownloadReady && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  {state.currentItem} / {state.totalItems}
                </span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {state.currentFile && !isDownloadReady && (
            <div className="text-xs text-muted-foreground truncate bg-secondary/50 px-3 py-2 rounded-lg">
              {state.currentFile}
            </div>
          )}

          {/* Pause/Resume buttons for export (hidden while waiting for confirmation) */}
          {state.type === "export" && !isDownloadReady && !state.awaitingConfirm && (
            <div className="flex gap-2">
              {state.isPaused ? (
                <Button onClick={onResume} className="flex-1" variant="default">
                  <Play className="w-4 h-4 mr-2" />
                  Devam Et
                </Button>
              ) : (
                <Button onClick={onPause} className="flex-1" variant="secondary">
                  <Pause className="w-4 h-4 mr-2" />
                  Duraklat
                </Button>
              )}
            </div>
          )}

          {isDownloadReady && state.downloadUrl && (
            <div className="space-y-3">
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-sm font-medium text-primary mb-2">
                  ZIP hazır! Aşağıdaki butona tıklayarak indirebilirsiniz:
                </p>
                <Button asChild className="w-full" size="lg">
                  <a href={state.downloadUrl} download={state.downloadFilename || "cloud-export.zip"}>
                    <Download className="w-4 h-4 mr-2" />
                    ZIP'i İndir (Tekrar tıklayabilirsiniz)
                  </a>
                </Button>
              </div>

              {state.awaitingConfirm && (
                <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-sm text-destructive-foreground mb-2">
                    ⚠️ İndirdiğinizden emin olana kadar aşağıdaki butona TIKLAMAYIN!
                  </p>
                  <Button
                    className="w-full"
                    variant="destructive"
                    onClick={onConfirmContinue}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    İndirdim, Sil ve Sonraki Batch'e Geç
                  </Button>
                </div>
              )}

              {!state.awaitingConfirm && (
                <p className="text-xs text-muted-foreground text-center">
                  İndirme başladıktan sonra bu pencereyi kapatabilirsiniz.
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
