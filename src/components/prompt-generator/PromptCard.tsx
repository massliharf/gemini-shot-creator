import { useState } from "react";
import {
  Pencil, Check, X, Trash2, ImageIcon, Loader2, Download, RefreshCw, Copy, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface PromptImage {
  id: string;
  image_url: string | null;
  status?: string;
  error_message?: string;
}

interface StylePrompt {
  id: string;
  prompt_text: string;
  prompt_label: string;
  thumbnail_url: string | null;
  images?: PromptImage[];
}

interface PromptCardProps {
  prompt: StylePrompt;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onGenerate: (prompt: StylePrompt) => void;
  onImageClick: (imageUrl: string) => void;
  onDeleteImage: (imageId: string) => void;
  isGenerating: boolean;
}

export const PromptCard = ({
  prompt, onEdit, onDelete, onGenerate, onImageClick, onDeleteImage, isGenerating,
}: PromptCardProps) => {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(prompt.prompt_text);
  const [expanded, setExpanded] = useState(false);

  const images = prompt.images || [];
  const thumbnail = prompt.thumbnail_url || images.find((i) => i.image_url)?.image_url;
  const hasImages = images.length > 0;

  const handleSave = () => {
    if (editText.trim()) {
      onEdit(prompt.id, editText.trim());
      setEditing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt.prompt_text);
    toast.success("Prompt copied");
  };

  const handleDownload = async (imageUrl: string) => {
    try {
      const resp = await fetch(imageUrl);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `style-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed");
    }
  };

  return (
    <div className="border border-border/50 rounded-xl bg-card overflow-hidden">
      <div className="flex gap-3 p-3">
        {/* Thumbnail */}
        <div
          className="w-16 h-16 rounded-lg bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center cursor-pointer"
          onClick={() => thumbnail && onImageClick(thumbnail)}
        >
          {thumbnail ? (
            <img src={thumbnail} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-5 h-5 text-muted-foreground/30" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-medium text-muted-foreground bg-accent px-1.5 py-0.5 rounded">
              {prompt.prompt_label}
            </span>
            <div className="flex-1" />
            <button onClick={handleCopy} className="p-1 rounded hover:bg-accent transition-colors" title="Copy">
              <Copy className="w-3 h-3 text-muted-foreground" />
            </button>
            <button
              onClick={() => { setEditText(prompt.prompt_text); setEditing(!editing); }}
              className="p-1 rounded hover:bg-accent transition-colors"
              title="Edit"
            >
              <Pencil className="w-3 h-3 text-muted-foreground" />
            </button>
            <button
              onClick={() => onDelete(prompt.id)}
              className="p-1 rounded hover:bg-destructive/10 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
            </button>
          </div>

          {editing ? (
            <div className="space-y-2">
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="text-xs min-h-[60px] resize-none"
                rows={3}
              />
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={handleSave}>
                  <Check className="w-3 h-3 mr-1" /> Save
                </Button>
                <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setEditing(false)}>
                  <X className="w-3 h-3 mr-1" /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{prompt.prompt_text}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-3 pb-2 flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[10px]"
          onClick={() => onGenerate(prompt)}
          disabled={isGenerating}
        >
          {isGenerating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <ImageIcon className="w-3 h-3 mr-1" />}
          Generate
        </Button>

        {hasImages && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[10px] ml-auto"
            onClick={() => setExpanded(!expanded)}
          >
            {images.length} image{images.length !== 1 ? "s" : ""}
            {expanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
          </Button>
        )}
      </div>

      {/* Image gallery */}
      {expanded && hasImages && (
        <div className="border-t border-border/30 p-2">
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
            {images.map((img) => (
              <div key={img.id} className="aspect-square rounded-md overflow-hidden relative group bg-muted">
                {img.image_url ? (
                  <>
                    <img
                      src={img.image_url}
                      alt=""
                      className="w-full h-full object-cover cursor-pointer"
                      loading="lazy"
                      onClick={() => onImageClick(img.image_url!)}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                      <button
                        className="h-6 w-6 rounded bg-background/90 flex items-center justify-center"
                        onClick={(e) => { e.stopPropagation(); handleDownload(img.image_url!); }}
                      >
                        <Download className="w-2.5 h-2.5" />
                      </button>
                      <button
                        className="h-6 w-6 rounded bg-background/90 flex items-center justify-center"
                        onClick={(e) => { e.stopPropagation(); onDeleteImage(img.id); }}
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </>
                ) : img.status === "generating" ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground/50" />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <X className="w-4 h-4 text-destructive/50" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
