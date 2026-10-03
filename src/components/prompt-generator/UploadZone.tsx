import { useRef, useState, useCallback } from "react";
import { Upload, X, Loader2, Camera, Sparkles } from "lucide-react";
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
      <div className="flex-1 flex items-center justify-center px-4 md:px-8" aria-busy="true" aria-live="polite">
        <div className="text-center flex flex-col items-center gap-3">
          <Loader2 className="size-6 animate-spin text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-heading-md text-foreground">Analyzing style...</p>
            <p className="text-body-sm text-muted-foreground">AI is generating prompts from your reference images</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 md:px-8">
      <div
        role={previews.length === 0 ? "button" : undefined}
        tabIndex={previews.length === 0 ? 0 : undefined}
        aria-label={previews.length === 0 ? "Upload reference images" : undefined}
        className={`dropzone w-full max-w-xl p-6 md:p-10 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
          dragOver
            ? "border-ring bg-control-hover"
            : previews.length === 0
              ? "hover:bg-control-hover cursor-pointer"
              : ""
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !previews.length && fileInputRef.current?.click()}
      >
        {previews.length === 0 ? (
          <>
            <Camera className="size-5 text-muted-foreground mx-auto mb-3" strokeWidth={1.5} aria-hidden="true" />
            <p className="text-label-md text-foreground mb-1">Upload reference images</p>
            <p className="text-caption text-muted-foreground mb-4">
              Drag & drop or click to select. Upload one or more style reference photos.
            </p>
            <Button variant="outline" size="md" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
              <Upload strokeWidth={1.5} aria-hidden="true" /> Browse files
            </Button>
          </>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2 justify-center">
              {previews.map((p, i) => (
                <div key={i} className="relative size-20 rounded-md overflow-hidden group bg-card">
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    aria-label={`Remove image ${i + 1}`}
                    onClick={(e) => { e.stopPropagation(); removePreview(i); }}
                    className="absolute inset-0 bg-foreground/50 text-white flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  >
                    <X className="size-5" strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                aria-label="Add more images"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="dropzone size-20 bg-card hover:bg-control text-muted-foreground hover:text-foreground flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Upload className="size-5" strokeWidth={1.5} aria-hidden="true" />
              </button>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2 justify-center">
              <Button variant="outline" size="md" onClick={(e) => { e.stopPropagation(); setPreviews([]); }}>
                Clear all
              </Button>
              <Button variant="primary" size="md" onClick={(e) => { e.stopPropagation(); handleSubmit(); }}>
                Analyze style ({previews.length} {previews.length === 1 ? "image" : "images"})
                <Sparkles strokeWidth={1.5} aria-hidden="true" />
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
