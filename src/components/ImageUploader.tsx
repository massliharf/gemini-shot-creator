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
        <div className="relative group size-[65px] rounded-md overflow-hidden bg-control">
          <img
            src={previewUrl}
            alt="Reference"
            className="size-full object-cover"
          />
          <Button
            type="button"
            onClick={handleClear}
            variant="ghost"
            size="icon-xs"
            aria-label="Remove reference image"
            className="absolute top-1 right-1 bg-card/90 backdrop-blur-sm hover:bg-card opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity duration-fast ease-standard"
          >
            <X strokeWidth={1.5} aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <label className="dropzone relative flex flex-col items-center justify-center gap-1 size-[65px] text-muted-foreground cursor-pointer hover:text-foreground focus-within:border-ring">
          <Upload className="size-4" strokeWidth={1.5} aria-hidden="true" />
          <span className="text-label-md leading-none">
            Face
          </span>
          <input
            type="file"
            aria-label="Upload face reference image"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept="image/*"
            onChange={handleFileChange}
          />
        </label>
      )}
    </>
  );
};
