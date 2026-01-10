import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, AlertCircle, Loader2 } from "lucide-react";
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
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <AppLayout userEmail={userEmail}>
      <main className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Pack Editor</h1>
              <p className="text-sm text-muted-foreground">Paste JSON to create a new pack</p>
            </div>
          </div>

          {/* JSON Input Area */}
          <div className="bg-card rounded-2xl border border-border/50 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Upload className="w-5 h-5 text-primary" />
              <h2 className="font-medium">Paste JSON Pack</h2>
            </div>

            <textarea
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setError(null);
              }}
              placeholder='{"meta": {...}, "global_style_anchor": "...", "scenes": [...]} '
              className="w-full h-96 p-4 text-sm font-mono bg-secondary border-0 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none resize-none"
              disabled={isUploading}
            />

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm mt-3">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                disabled={isUploading}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePaste}
                disabled={isUploading || !jsonText.trim()}
                className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Pack
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </AppLayout>
  );
};

export default PackEditor;

