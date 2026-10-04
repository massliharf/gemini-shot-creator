import { useState } from "react";
import { XCircle } from "lucide-react";
import { toast } from "sonner";
import type { PackFile } from "@/types/pack";
import { safePackId, safePackName, safeSceneCount } from "@/components/packs/packMeta";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type PacksLoadResult = {
  uploadedCount: number;
  failed: Array<{ index: number; message: string }>;
};

interface PackUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPacksLoad?: (packs: PackFile[]) => Promise<PacksLoadResult>;
}

/** Strips code fences and surrounding prose so a pasted LLM answer still parses. */
const extractJsonSlice = (raw: string) => {
  let s = raw.trim();
  if (s.startsWith("```json")) s = s.slice(7);
  else if (s.startsWith("```")) s = s.slice(3);
  if (s.endsWith("```")) s = s.slice(0, -3);
  s = s.trim();
  const firstCurly = s.indexOf("{");
  const firstSquare = s.indexOf("[");
  const start = firstCurly === -1 ? firstSquare : firstSquare === -1 ? firstCurly : Math.min(firstCurly, firstSquare);
  if (start === -1) return s;
  const lastCurly = s.lastIndexOf("}");
  const lastSquare = s.lastIndexOf("]");
  const end = Math.max(lastCurly, lastSquare);
  if (end === -1 || end <= start) return s.slice(start);
  return s.slice(start, end + 1);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizeToPacks = (parsed: any): PackFile[] => {
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    if (parsed.pack && typeof parsed.pack === "object") return [parsed.pack as PackFile];
    if (Array.isArray(parsed.packs)) return parsed.packs as PackFile[];
    if (Array.isArray(parsed.data)) return parsed.data as PackFile[];
    if (parsed.data && typeof parsed.data === "object") {
      if (parsed.data.pack) return [parsed.data.pack as PackFile];
      if (Array.isArray(parsed.data.packs)) return parsed.data.packs as PackFile[];
    }
  }
  if (Array.isArray(parsed)) return parsed as PackFile[];
  return [parsed as PackFile];
};

/** "Paste JSON pack" dialog shared by the pack list toolbar and the Packs start view. */
export const PackUploadDialog = ({ open, onOpenChange, onPacksLoad }: PackUploadDialogProps) => {
  const [jsonText, setJsonText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleJsonUpload = async () => {
    if (!jsonText.trim() || !onPacksLoad) {
      setUploadError("Please paste JSON content");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const parsed = JSON.parse(extractJsonSlice(jsonText));
      const packsToUpload = normalizeToPacks(parsed);

      for (const pack of packsToUpload) {
        if (!safePackId(pack).trim() || !safePackName(pack, "")) {
          setUploadError("Invalid JSON: missing pack_id or package_name");
          setIsUploading(false);
          return;
        }
        if (safeSceneCount(pack) === 0) {
          setUploadError("Invalid JSON: missing or empty scenes array");
          setIsUploading(false);
          return;
        }
      }

      const result = await onPacksLoad(packsToUpload);
      if (result.uploadedCount > 0) {
        setJsonText("");
        onOpenChange(false);
        toast.success(`${result.uploadedCount} pack(s) uploaded`);
      }
      if (result.failed.length > 0) {
        setUploadError(`${result.failed.length} pack(s) failed`);
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        setUploadError("Invalid JSON syntax");
      } else {
        setUploadError(err instanceof Error ? err.message : "Upload failed");
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Paste JSON pack</AlertDialogTitle>
          <AlertDialogDescription>
            Paste one pack or an array of packs. Code fences and surrounding text are ignored.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <label htmlFor="pack-json-input" className="sr-only">
            JSON pack content
          </label>
          <textarea
            id="pack-json-input"
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setUploadError(null);
            }}
            placeholder='{"meta": {...}, "global_style_anchor": "...", "scenes": [...]}'
            className="w-full h-48 p-3 text-code font-mono bg-card text-foreground placeholder:text-tertiary-foreground rounded-md border border-border transition-colors duration-fast ease-standard hover:border-border-strong focus-visible:outline-none focus-visible:border-ring aria-[invalid=true]:border-destructive disabled:cursor-not-allowed disabled:text-tertiary-foreground resize-none"
            disabled={isUploading}
            aria-invalid={uploadError ? true : undefined}
            aria-describedby={uploadError ? "pack-json-error" : undefined}
          />
          {uploadError && (
            <div id="pack-json-error" role="alert" className="flex items-center gap-2 text-destructive text-body-sm">
              <XCircle className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isUploading}>Cancel</AlertDialogCancel>
          <Button
            variant="primary"
            onClick={handleJsonUpload}
            disabled={isUploading || !jsonText.trim()}
            loading={isUploading}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
