import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { PackFile, getPackId, getPackName, hasScenes } from "@/types/pack";

interface PacksLoadResult {
  uploadedCount: number;
  failed: Array<{ index: number; message: string }>;
}

interface PackEditorProps {
  onPacksLoad?: (packs: PackFile[]) => Promise<PacksLoadResult>;
}

const PackEditor = ({ onPacksLoad }: PackEditorProps) => {
  const navigate = useNavigate();
  const [jsonText, setJsonText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [authChecking, setAuthChecking] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setUserEmail(session?.user?.email || "");
      setAuthChecking(false);
      if (!session) navigate("/auth");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setUserEmail(session?.user?.email || "");
      if (!session) navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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

  const handlePaste = async () => {
    if (!jsonText.trim()) {
      setError("Please paste JSON content");
      return;
    }

    if (!onPacksLoad) {
      toast.error("Pack loading not available");
      return;
    }

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
        toast.success(`${result.uploadedCount} pack(s) uploaded`);
        navigate("/");
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

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-body-sm text-muted-foreground" role="status" aria-live="polite">
          <Loader2 className="size-4 animate-spin" strokeWidth={1.5} aria-hidden="true" />
          Loading...
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <AppLayout userEmail={userEmail}>
      <main className="flex-1 min-h-0 overflow-y-auto flex flex-col bg-background">
        <div className="flex-1 px-4 md:px-8 pt-6 pb-8">
          <div className="max-w-container-md mx-auto space-y-6">
            {/* Page header */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                aria-label="Back to home"
                className="shrink-0 -ml-2"
              >
                <ArrowLeft strokeWidth={1.5} aria-hidden="true" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-heading-md text-foreground">Pack editor</h1>
                <p className="text-body-sm text-muted-foreground">Paste JSON to create a new pack</p>
              </div>
            </div>

            {/* Content card: JSON input */}
            <section
              aria-labelledby="pack-json-heading"
              className="bg-card text-card-foreground rounded-lg p-4 md:p-7 space-y-5"
            >
              <div className="min-w-0">
                <h2 id="pack-json-heading" className="text-heading-sm text-foreground">
                  Pack JSON
                </h2>
                <p className="text-body-sm text-muted-foreground">
                  Paste a single pack, an array of packs, or an API response wrapper. Markdown fences are stripped
                  automatically.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="pack-json">JSON content</Label>
                  <span className="text-caption text-tertiary-foreground tabular-nums" aria-hidden="true">
                    {jsonText.length.toLocaleString()} chars
                  </span>
                </div>
                <Textarea
                  id="pack-json"
                  value={jsonText}
                  onChange={(e) => {
                    setJsonText(e.target.value);
                    setError(null);
                  }}
                  placeholder='{"meta": {...}, "global_style_anchor": "...", "scenes": [...]} '
                  className="h-96 text-code resize-none"
                  disabled={isUploading}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "pack-json-error" : "pack-json-help"}
                  spellCheck={false}
                />
                {error ? (
                  <div
                    id="pack-json-error"
                    role="alert"
                    className="flex items-start gap-1.5 text-caption text-destructive"
                  >
                    <XCircle className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                    <span>{error}</span>
                  </div>
                ) : (
                  <p id="pack-json-help" className="text-caption text-tertiary-foreground">
                    Required fields: pack_id, package_name and a non-empty scenes array.
                  </p>
                )}
              </div>

              {/* Action row */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={() => navigate("/")}
                  disabled={isUploading}
                  className="h-control-lg md:h-control-md"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handlePaste}
                  disabled={isUploading || !jsonText.trim()}
                  className="h-control-lg md:h-control-md"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="animate-spin" strokeWidth={1.5} aria-hidden="true" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload strokeWidth={1.5} aria-hidden="true" />
                      Upload pack
                    </>
                  )}
                </Button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </AppLayout>
  );
};

export default PackEditor;
