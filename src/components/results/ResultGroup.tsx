import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { SampleChip } from "@/components/SampleNotice";
import { relativeTime } from "@/data/mock";
import { cn } from "@/lib/utils";

interface ResultGroupProps {
  /** One-line summary shown in the header (usually the prompt or pack name). */
  title: string;
  /** Meta chips after the title: model, aspect ratio, resolution, scene count… */
  meta?: ReactNode[];
  /** Extra status chips (success / warning badges) rendered after the meta chips. */
  status?: ReactNode;
  /** ISO timestamp, shown as relative time. */
  createdAt?: string;
  /** Small element before the title (thumbnail, icon). */
  leading?: ReactNode;
  /** Header actions on the right (ghost buttons). */
  actions?: ReactNode;
  /** Marks the group as sample content. */
  sample?: boolean;
  /** Heading element for the title. */
  as?: "h2" | "h3" | "p";
  className?: string;
  children: ReactNode;
}

/**
 * Results feed group (Magnific tool page pattern): `bg-app` block with a
 * header row — truncated title, meta chips, relative time — and content below.
 */
export const ResultGroup = ({
  title,
  meta = [],
  status,
  createdAt,
  leading,
  actions,
  sample,
  as: Heading = "h3",
  className,
  children,
}: ResultGroupProps) => (
  <section className={cn("bg-app rounded-lg p-3 sm:p-4 space-y-3", className)} aria-label={title}>
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 min-w-0">
      <div className="flex items-center gap-2 min-w-0 flex-1 basis-0">
        {leading}
        <Heading className="truncate text-label-md text-foreground min-w-0" title={title}>
          {title}
        </Heading>
        {sample && <SampleChip className="shrink-0" />}
      </div>
      {/* Mobile: chips drop to their own row under the title; actions stay top-right. */}
      <div className="order-last w-full sm:order-none sm:w-auto flex items-center gap-1.5 flex-wrap sm:flex-nowrap sm:shrink-0">
        {meta.map((m, i) => (
          <Badge key={i}>{m}</Badge>
        ))}
        {status}
        {createdAt && (
          <time dateTime={createdAt} className="text-caption text-muted-foreground whitespace-nowrap px-1">
            {relativeTime(createdAt)}
          </time>
        )}
      </div>
      {actions && <div className="flex items-center gap-1 shrink-0 -my-1">{actions}</div>}
    </header>
    {children}
  </section>
);

interface ResultGridProps {
  children: ReactNode;
  /** `comfortable` (default) for single images, `dense` for pack scenes. */
  density?: "comfortable" | "dense";
  className?: string;
  "aria-label"?: string;
}

/** Responsive square-tile grid used inside a ResultGroup. */
export const ResultGrid = ({ children, density = "comfortable", className, ...rest }: ResultGridProps) => (
  <div
    className={cn(
      "grid gap-2 sm:gap-3 [&>*]:min-w-0",
      density === "comfortable"
        ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
        : "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8",
      className,
    )}
    {...rest}
  >
    {children}
  </div>
);
