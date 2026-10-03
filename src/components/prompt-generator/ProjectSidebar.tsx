import { Plus, Trash2, Loader2, Camera, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
      {/* Panel header — heading-sm + caption count, no divider line */}
      <div className="px-3 pt-3 pb-2 flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2 min-w-0">
          <h2 className="text-heading-sm text-foreground truncate">Style projects</h2>
          {!loading && projects.length > 0 && (
            <span className="text-caption text-muted-foreground shrink-0">{projects.length}</span>
          )}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={onNew} aria-label="New style project">
              <Plus strokeWidth={1.5} aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>New project</TooltipContent>
        </Tooltip>
      </div>
      <ScrollArea className="flex-1">
        <div className="px-2 pb-2 space-y-0.5">
          {loading && (
            <div className="space-y-0.5" aria-busy="true" aria-live="polite">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-2 px-2 h-control-md">
                  <Skeleton className="size-6 rounded-sm shrink-0" />
                  <Skeleton className="h-3 flex-1 max-w-[70%]" />
                </div>
              ))}
            </div>
          )}
          {!loading && projects.length === 0 && (
            <div className="flex flex-col items-center text-center px-4 py-10 gap-3">
              <Images className="size-6 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
              <div className="space-y-1">
                <p className="text-heading-md text-foreground">No style projects yet</p>
                <p className="text-body-sm text-muted-foreground">
                  Upload reference images to generate style prompts
                </p>
              </div>
            </div>
          )}
          {!loading && projects.length > 0 && (
            <p className="text-overline text-muted-foreground px-2 pt-2 pb-1">Recent</p>
          )}
          {projects.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              aria-current={selectedId === p.id ? "true" : undefined}
              data-active={selectedId === p.id ? "true" : undefined}
              className="nav-item group w-full text-left px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              {/* Thumbnail 24px */}
              <div className="size-6 rounded-sm bg-control shrink-0 overflow-hidden flex items-center justify-center">
                {p.reference_image_urls?.[0] ? (
                  <img src={p.reference_image_urls[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="size-3.5 text-tertiary-foreground" strokeWidth={1.5} aria-hidden="true" />
                )}
              </div>
              <span className="flex-1 min-w-0 truncate">{p.name}</span>
              <span className="text-caption text-tertiary-foreground shrink-0">
                {p.status === "pending" || p.status === "analyzing" ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="size-3 animate-spin" strokeWidth={1.5} aria-hidden="true" /> Analyzing...
                  </span>
                ) : (
                  `${p.reference_image_urls?.length || 0} ref images`
                )}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Delete ${p.name}`}
                    onClick={(e) => { e.stopPropagation(); onDelete(p.id); }}
                    className="inline-flex items-center justify-center h-control-xs w-control-xs shrink-0 rounded-sm text-muted-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 hover:bg-danger-bg hover:text-danger-text transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Delete project</TooltipContent>
              </Tooltip>
            </button>
          ))}
        </div>
      </ScrollArea>
    </>
  );
};

// TODO(magnific): The delete control is a <button> nested inside the project row <button> (invalid HTML, pre-existing).
// Lifting it out requires restructuring the row (div + sibling buttons) and re-wiring handlers — out of presentation scope.
