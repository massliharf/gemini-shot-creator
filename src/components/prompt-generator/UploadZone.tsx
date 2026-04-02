import { useRef, useState, useCallback } from "react";
import { Upload, X, Loader2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UploadZoneProps {
  onUpload: (files: File[]) => void;
  isAnalyzing: boolean;
}

export const UploadZone = ({ onUpload, isAnalyzing }: UploadZoneProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = useCallback((files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    const newPreviews = imageFiles.map((f) => ({ file: f, url: URL.createObjectURL(f) }));
    setPreviews((prev) => [...prev, ...newPreviews]);
  }, []);

  const removePreview = (index: number) => {
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      addFiles(Array.from(e.dataTransfer.files));
    },
    [addFiles]
  );

  const handleSubmit = () => {
    if (previews.length === 0) return;
    onUpload(previews.map((p) => p.file));
  };

  if (isAnalyzing) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Analyzing style...</p>
            <p className="text-xs text-muted-foreground mt-1">AI is generating prompts from your reference images</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div
        className={`w-full max-w-xl border-2 border-dashed rounded-2xl p-10 text-center transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border/50 hover:border-border"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !previews.length && fileInputRef.current?.click()}
      >
        {previews.length === 0 ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4">
              <Camera className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium mb-1">Upload reference images</p>
            <p className="text-xs text-muted-foreground mb-4">
              Drag & drop or click to select. Upload one or more style reference photos.
            </p>
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
              <Upload className="w-3.5 h-3.5 mr-1.5" /> Browse files
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 justify-center">
              {previews.map((p, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden group">
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => { e.stopPropagation(); removePreview(i); }}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
              <button
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-muted-foreground/50 flex items-center justify-center transition-colors"
              >
                <Upload className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setPreviews([]); }}>
                Clear all
              </Button>
              <Button size="sm" onClick={(e) => { e.stopPropagation(); handleSubmit(); }}>
                Analyze Style ({previews.length} {previews.length === 1 ? "image" : "images"})
              </Button>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(Array.from(e.target.files || []));
          e.target.value = "";
        }}
      />
    </div>
  );
};
