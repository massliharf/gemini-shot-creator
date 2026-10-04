import { mockImage, samplePromptIdeas, type MockImageKey } from "@/data/mock";
import { cn } from "@/lib/utils";

/** Thumbnails that match the default sample prompt ideas (by position). */
const IDEA_THUMBS: MockImageKey[] = ["portrait-lilac", "product-coral", "space-terracotta", "portrait-close-blush"];

interface PromptIdeasProps {
  onSelect: (prompt: string) => void;
  ideas?: string[];
  label?: string;
  className?: string;
}

/** Clickable prompt suggestions; picking one fills the prompt field. */
export const PromptIdeas = ({ onSelect, ideas = samplePromptIdeas, label = "Try an idea", className }: PromptIdeasProps) => (
  <div className={cn("space-y-1.5", className)} role="group" aria-labelledby="prompt-ideas-label">
    <p id="prompt-ideas-label" className="text-overline text-muted-foreground">
      {label}
    </p>
    <ul className="flex flex-wrap gap-1.5">
      {ideas.map((idea, i) => {
        const thumb = ideas === samplePromptIdeas ? IDEA_THUMBS[i] : undefined;
        return (
          <li key={idea} className="min-w-0 max-w-full">
            <button
              type="button"
              onClick={() => onSelect(idea)}
              title={idea}
              aria-label={`Use prompt: ${idea}`}
              className={cn(
                "inline-flex max-w-full items-center gap-1.5 h-control-lg md:h-control-sm rounded-md bg-control pr-2.5 text-label-md text-muted-foreground",
                thumb ? "pl-1" : "pl-2.5",
                "transition-colors duration-fast ease-standard hover:bg-control-hover hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              {thumb && (
                <img src={mockImage(thumb)} alt="" aria-hidden="true" className="size-8 md:size-5 shrink-0 rounded-xs object-cover" />
              )}
              <span className="truncate">{idea}</span>
            </button>
          </li>
        );
      })}
    </ul>
  </div>
);
