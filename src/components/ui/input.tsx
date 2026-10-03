import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-control-lg md:h-control-md w-full rounded-md border border-transparent bg-control px-3 py-1 text-base md:text-sm font-medium text-foreground transition-[border-color,background-color,box-shadow] duration-fast ease-standard file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-tertiary-foreground placeholder:font-normal hover:bg-control-hover focus-visible:outline-none focus-visible:bg-card focus-visible:border-ring aria-[invalid=true]:border-destructive disabled:cursor-not-allowed disabled:text-tertiary-foreground read-only:bg-transparent",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
