import { Plus, Trash2, Loader2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StyleProject {
  id: string;
  name: string;
  status: string;
  reference_image_urls: string[];
  created_at: string;
}

interface ProjectSidebarProps {
  projects: StyleProject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  loading: boolean;
}

export const ProjectSidebar = ({ projects, selectedId, onSelect, onNew, onDelete, loading }: ProjectSidebarProps) => {
  return (
    <>
      <div className="p-3 border-b border-border/50 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Style Projects</h2>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onNew}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && projects.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8 px-4">
              Upload reference images to generate style prompts
            </p>
          )}
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`w-full text-left rounded-lg p-2.5 transition-colors group flex items-start gap-2.5 ${
                selectedId === p.id
                  ? "bg-accent"
                  : "hover:bg-accent/50"
              }`}
            >
              {/* Thumbnail */}
              <div className="w-9 h-9 rounded-md bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center">
                {p.reference_image_urls?.[0] ? (
                  <img src={p.reference_image_urls[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-3.5 h-3.5 text-muted-foreground/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{p.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {p.status === "pending" || p.status === "analyzing" ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" /> Analyzing...
                    </span>
                  ) : (
                    `${p.reference_image_urls?.length || 0} ref images`
                  )}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(p.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-all"
              >
                <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
              </button>
            </button>
          ))}
        </div>
      </ScrollArea>
    </>
  );
};
