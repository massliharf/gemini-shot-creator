import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  onImageClear?: () => void;
  previewUrl?: string | null;
}

export const ImageUploader = ({ onImageUpload, onImageClear, previewUrl }: ImageUploaderProps) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file");
      return;
    }

    onImageUpload(file);
    e.target.value = "";
  };

  const handleClear = () => {
    onImageClear?.();
  };

  return (
    <>
      {previewUrl ? (
        <div className="relative group">
          <img
            src={previewUrl}
            alt="Reference"
            className="w-full h-20 object-cover border border-border"
          />
          <Button
            onClick={handleClear}
            variant="outline"
            size="icon"
            className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity bg-background"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <label className="relative flex flex-col items-center justify-center w-full h-20 border border-dashed border-border cursor-pointer bg-muted/10 hover:bg-muted/30 hover:border-foreground/40 transition-colors">
          <Upload className="w-4 h-4 mb-1 text-muted-foreground" />
          <p className="text-[10px] text-muted-foreground">
            Upload face
          </p>
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept="image/*"
            onChange={handleFileChange}
          />
        </label>
      )}
    </>
  );
};
