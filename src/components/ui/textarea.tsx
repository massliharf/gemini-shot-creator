import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[96px] w-full rounded-md border border-border bg-card px-3 py-3 text-base md:text-base text-foreground transition-[border-color,box-shadow] duration-fast ease-standard placeholder:text-tertiary-foreground focus-visible:outline-none focus-visible:border-ring aria-[invalid=true]:border-destructive disabled:cursor-not-allowed disabled:text-tertiary-foreground resize-y",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
