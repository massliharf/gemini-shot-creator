import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { isDemoMode } from "@/lib/demo";

interface SampleNoticeProps {
  /** What the sample stands in for, e.g. "Your generations will appear here." */
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/**
 * Quiet one-line notice placed above sample content on an empty page, so
 * people can tell examples from their own work.
 */
export const SampleNotice = ({ children, action, className }: SampleNoticeProps) => (
  <div
    role="note"
    className={cn("flex items-center gap-3 rounded-lg bg-card px-4 py-2.5 text-body-sm text-muted-foreground", className)}
  >
    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand" aria-hidden="true">
      <Sparkles className="size-3.5" strokeWidth={2} />
    </span>
    <p className="min-w-0 flex-1 truncate">
      <span className="text-label-md text-foreground">{isDemoMode() ? "Demo workspace" : "Sample content"}</span>
      <span className="mx-1.5 text-tertiary-foreground" aria-hidden="true">·</span>
      {children ?? "Your own work will appear here."}
    </p>
    {action}
  </div>
);

/** Small "Sample" chip for cards and group headers. */
export const SampleChip = ({ className }: { className?: string }) => (
  <span className={cn("inline-flex h-5 items-center rounded-full bg-brand-soft px-2 text-micro text-brand", className)}>Sample</span>
);
