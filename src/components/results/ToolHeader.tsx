import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Category = "image" | "video" | "audio" | "design" | "3d" | "spaces";

/* Static class names so Tailwind picks them up. */
const CATEGORY_CLASSES: Record<Category, { card: string; icon: string }> = {
  image: { card: "bg-cat-image/10", icon: "bg-cat-image/15 text-cat-image" },
  video: { card: "bg-cat-video/10", icon: "bg-cat-video/15 text-cat-video" },
  audio: { card: "bg-cat-audio/10", icon: "bg-cat-audio/15 text-cat-audio" },
  design: { card: "bg-cat-design/10", icon: "bg-cat-design/15 text-cat-design" },
  "3d": { card: "bg-cat-3d/10", icon: "bg-cat-3d/15 text-cat-3d" },
  spaces: { card: "bg-cat-spaces/10", icon: "bg-cat-spaces/15 text-cat-spaces" },
};

interface ToolHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  category: Category;
  /** Chips next to the title (e.g. "Auto-render"). */
  badge?: ReactNode;
  /** Right-aligned icon actions. */
  actions?: ReactNode;
  className?: string;
}

/** Tool title card at the top of a tool panel, tinted with the tool's category colour. */
export const ToolHeader = ({ icon: Icon, title, description, category, badge, actions, className }: ToolHeaderProps) => {
  const c = CATEGORY_CLASSES[category];
  return (
    <div className={cn("rounded-[12px] p-2 pr-3 flex items-center gap-2.5", c.card, className)}>
      <span className={cn("size-9 shrink-0 rounded-md flex items-center justify-center", c.icon)} aria-hidden="true">
        <Icon className="size-5" strokeWidth={1.5} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-heading-sm text-foreground truncate">{title}</h1>
          {badge}
        </div>
        {description && <p className="text-caption text-muted-foreground truncate">{description}</p>}
      </div>
      {actions}
    </div>
  );
};
