import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-xs border px-2 h-6 text-caption whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring [&_svg]:size-3.5",
  {
    variants: {
      variant: {
        /* Meta chip (varsayılan): "wan 3.0", "16:9", "12 sec" */
        default: "border-border bg-control text-foreground",
        neutral: "border-border bg-control text-foreground",
        secondary: "border-border bg-control text-muted-foreground",
        outline: "border-border bg-transparent text-foreground",
        /* Pembe etiket: "New", "Flow", "UPGRADE" */
        brand: "border-transparent bg-brand-soft text-brand rounded-full font-medium",
        solid: "border-transparent bg-primary text-primary-foreground",
        destructive: "border-transparent bg-danger-bg text-danger-text",
        danger: "border-transparent bg-danger-bg text-danger-text",
        success: "border-transparent bg-success-bg text-success-text",
        warning: "border-transparent bg-warning-bg text-warning-text",
        info: "border-transparent bg-info-bg text-info-text",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
