import { useState } from "react";
import {
  Pencil, Check, X, Trash2, ImageIcon, Loader2, Download, Copy, ChevronDown, ChevronUp, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
    <article className="bg-card rounded-lg p-4 text-card-foreground">
      <div className="flex gap-4">
        {/* Thumbnail */}
        <div
          role={thumbnail ? "button" : undefined}
          tabIndex={thumbnail ? 0 : undefined}
          aria-label={thumbnail ? "View generated image" : undefined}
          className={`size-16 rounded-md bg-control shrink-0 overflow-hidden flex items-center justify-center ${thumbnail ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" : ""}`}
          onClick={() => thumbnail && onImageClick(thumbnail)}
        >
          {thumbnail ? (
            <img src={thumbnail} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="size-5 text-tertiary-foreground" strokeWidth={1.5} aria-hidden="true" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header: title + meta + toolbar */}
          <div className="flex items-start gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-label-md text-foreground truncate">{prompt.prompt_label}</h3>
              <p className="text-caption text-muted-foreground">
                {hasImages ? `${images.length} image${images.length !== 1 ? "s" : ""} generated` : "Not generated yet"}
              </p>
            </div>
            <div className="flex items-center gap-0.5 shrink-0" role="group" aria-label="Prompt actions">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-sm" onClick={handleCopy} aria-label="Copy prompt">
                    <Copy strokeWidth={1.5} aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy prompt</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={editing ? "Close editor" : "Edit prompt"}
                    aria-pressed={editing}
                    onClick={() => { setEditText(prompt.prompt_text); setEditing(!editing); }}
                  >
                    <Pencil strokeWidth={1.5} aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit prompt</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="hover:bg-danger-bg hover:text-danger-text"
                    aria-label="Delete prompt"
                    onClick={() => onDelete(prompt.id)}
                  >
                    <Trash2 strokeWidth={1.5} aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete prompt</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Body */}
          {editing ? (
            <div className="space-y-3">
              <label htmlFor={`prompt-edit-${prompt.id}`} className="sr-only">Prompt text</label>
              <Textarea
                id={`prompt-edit-${prompt.id}`}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="text-body-md min-h-[96px] resize-none"
                rows={3}
              />
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={handleSave}>
                  <Check strokeWidth={1.5} aria-hidden="true" /> Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  <X strokeWidth={1.5} aria-hidden="true" /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="bg-app rounded-md p-3 text-body-sm text-foreground line-clamp-2">
              {prompt.prompt_text}
            </p>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="pt-3 flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onGenerate(prompt)}
          disabled={isGenerating}
          aria-busy={isGenerating || undefined}
        >
          {isGenerating ? (
            <Loader2 className="animate-spin" strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <ImageIcon strokeWidth={1.5} aria-hidden="true" />
          )}
          Generate
        </Button>

        {hasImages && (
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
          >
            {images.length} image{images.length !== 1 ? "s" : ""}
            {expanded ? (
              <ChevronUp strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <ChevronDown strokeWidth={1.5} aria-hidden="true" />
            )}
          </Button>
        )}
      </div>

      {/* Image gallery */}
      {expanded && hasImages && (
        <div className="mt-3 bg-app rounded-md p-3">
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {images.map((img) => (
              <div key={img.id} className="aspect-square rounded-md overflow-hidden relative group bg-control">
                {img.image_url ? (
                  <>
                    <img
                      src={img.image_url}
                      alt=""
                      className="w-full h-full object-cover cursor-pointer"
                      loading="lazy"
                      onClick={() => onImageClick(img.image_url!)}
                    />
                    <div className="absolute inset-x-0 bottom-0 p-1 flex items-center justify-end gap-1 bg-foreground/25 text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity duration-fast ease-standard">
                      <button
                        type="button"
                        aria-label="Download image"
                        className="size-7 rounded-sm bg-card/90 text-foreground flex items-center justify-center hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={(e) => { e.stopPropagation(); handleDownload(img.image_url!); }}
                      >
                        <Download className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete image"
                        className="size-7 rounded-sm bg-card/90 text-foreground flex items-center justify-center hover:bg-danger-bg hover:text-danger-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={(e) => { e.stopPropagation(); onDeleteImage(img.id); }}
                      >
                        <Trash2 className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
                      </button>
                    </div>
                  </>
                ) : img.status === "generating" ? (
                  <div className="w-full h-full flex items-center justify-center" aria-busy="true" aria-label="Generating image">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center" role="img" aria-label="Generation failed">
                    <XCircle className="size-5 text-destructive" strokeWidth={1.5} aria-hidden="true" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
};

// TODO(magnific): Error-state thumbnails have no visible text (error_message is available) — surfacing it needs a layout decision on tiny tiles.
