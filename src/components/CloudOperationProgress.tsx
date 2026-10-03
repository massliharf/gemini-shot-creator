import { Progress } from "@/components/ui/progress";
import { Loader2, Download, Trash2, CheckCircle2, Pause, Play, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
            <Icon className="size-5 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {state.type === "export"
              ? "Exporting all your data from the cloud. Please wait…"
              : "Removing all your data from the cloud. This cannot be undone."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Status row */}
          <div className="flex items-start gap-3" role="status" aria-live="polite">
            {isDownloadReady ? (
              <Badge variant="success" className="shrink-0 mt-0.5">
                <CheckCircle2 strokeWidth={1.5} aria-hidden="true" />
                Ready
              </Badge>
            ) : state.isPaused ? (
              <Badge variant="warning" className="shrink-0 mt-0.5">
                <Pause strokeWidth={1.5} aria-hidden="true" />
                Paused
              </Badge>
            ) : (
              <Badge className="shrink-0 mt-0.5">
                <Loader2 className="animate-spin" strokeWidth={1.5} aria-hidden="true" />
                In progress
              </Badge>
            )}
            <span className="text-body-sm text-muted-foreground">
              {state.isPaused ? "Duraklatıldı - Devam etmek için butona tıklayın" : state.phase}
            </span>
          </div>

          {!isDownloadReady && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-caption text-foreground tabular-nums">
                  {state.currentItem} / {state.totalItems}
                </span>
                <span className="text-caption text-muted-foreground tabular-nums">{progress}%</span>
              </div>
              <Progress value={progress} className="h-1" aria-label={`${title} progress`} />
            </div>
          )}

          {state.currentFile && !isDownloadReady && (
            <div className="text-code text-muted-foreground truncate bg-control px-3 py-2 rounded-md">
              {state.currentFile}
            </div>
          )}

          {/* Pause/Resume buttons for export (hidden while waiting for confirmation) */}
          {state.type === "export" && !isDownloadReady && !state.awaitingConfirm && (
            <div className="flex gap-2">
              {state.isPaused ? (
                <Button onClick={onResume} className="flex-1 md:h-control-md md:text-label-md" size="lg" variant="outline">
                  <Play strokeWidth={1.5} aria-hidden="true" />
                  Devam Et
                </Button>
              ) : (
                <Button onClick={onPause} className="flex-1 md:h-control-md md:text-label-md" size="lg" variant="ghost">
                  <Pause strokeWidth={1.5} aria-hidden="true" />
                  Duraklat
                </Button>
              )}
            </div>
          )}

          {isDownloadReady && state.downloadUrl && (
            <div className="space-y-3">
              <div className="p-4 bg-app rounded-[12px]">
                <p className="text-body-sm text-muted-foreground mb-3 flex items-start gap-2">
                  <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-success" strokeWidth={1.5} aria-hidden="true" />
                  ZIP hazır! Aşağıdaki butona tıklayarak indirebilirsiniz:
                </p>
                <Button asChild variant="primary" fullWidth size="lg" className="md:h-control-md md:text-label-md">
                  <a href={state.downloadUrl} download={state.downloadFilename || "cloud-export.zip"}>
                    <Download strokeWidth={1.5} aria-hidden="true" />
                    ZIP'i İndir (Tekrar tıklayabilirsiniz)
                  </a>
                </Button>
              </div>

              {state.awaitingConfirm && (
                <div className="p-4 bg-danger-bg rounded-[12px]">
                  <p className="text-body-sm text-danger-text mb-3 flex items-start gap-2">
                    <AlertTriangle className="size-4 shrink-0 mt-0.5" strokeWidth={1.5} aria-hidden="true" />
                    İndirdiğinizden emin olana kadar aşağıdaki butona TIKLAMAYIN!
                  </p>
                  <Button
                    fullWidth
                    size="lg"
                    className="md:h-control-md md:text-label-md"
                    variant="danger-outline"
                    onClick={onConfirmContinue}
                  >
                    <Trash2 strokeWidth={1.5} aria-hidden="true" />
                    İndirdim, Sil ve Sonraki Batch'e Geç
                  </Button>
                </div>
              )}

              {!state.awaitingConfirm && (
                <p className="text-caption text-muted-foreground text-center">
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

// TODO(magnific): the "⚠️" emoji in the warning text was replaced by an AlertTriangle icon (text content otherwise unchanged); revert if the literal emoji is required.
