import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Magnific Button (Bölüm 6.1)
 * variant: primary | secondary | outline | ghost | danger | danger-outline | link
 * size: xs 28 · sm 32 · md 40 · lg 48 · xl 56 · icon (kare)
 * shadcn uyumluluğu için `default` → primary, `destructive` → danger alias'ları korunur.
 */
const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-label-md",
    "transition-[background-color,color,border-color,box-shadow,transform] duration-fast ease-standard",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none aria-disabled:pointer-events-none select-none",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        /* Siyah birincil: "+ Create", "+ Add", Generate. Pasifken gri #E3E3E3 + #616161 (opaklık değil renk). */
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active disabled:bg-primary-disabled disabled:text-primary-disabled-foreground aria-disabled:bg-primary-disabled aria-disabled:text-primary-disabled-foreground",
        default: "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active disabled:bg-primary-disabled disabled:text-primary-disabled-foreground aria-disabled:bg-primary-disabled aria-disabled:text-primary-disabled-foreground",
        /* Pembe marka: yalnızca global "+" oluştur / upgrade. İkon koyu. */
        brand: "bg-brand text-brand-foreground hover:brightness-95 active:brightness-90 disabled:opacity-disabled",
        /* Tonal: %5 gri dolgu, kenarlıksız (select/chip ile aynı yüzey) */
        secondary: "bg-control text-foreground hover:bg-control-hover active:bg-active disabled:text-tertiary-foreground disabled:hover:bg-control",
        /* Kenarlıklı beyaz: "Share", "Invite" */
        outline: "border border-border bg-card text-foreground hover:bg-control disabled:text-tertiary-foreground",
        ghost: "text-foreground hover:bg-control disabled:text-tertiary-foreground",
        /* Bilgi pill: "Guided tour" */
        info: "bg-info text-info-foreground rounded-full hover:brightness-95",
        danger: "bg-destructive text-destructive-foreground hover:brightness-95 disabled:opacity-disabled",
        destructive: "bg-destructive text-destructive-foreground hover:brightness-95 disabled:opacity-disabled",
        "danger-outline": "border border-border text-danger-text bg-card hover:bg-danger-bg disabled:text-tertiary-foreground",
        link: "text-link underline-offset-4 hover:underline h-auto px-0 disabled:text-tertiary-foreground",
      },
      size: {
        xs: "h-control-xs px-2 text-label-sm [&_svg]:size-3.5 rounded-sm",
        sm: "h-control-sm px-3 text-label-md",
        md: "h-control-md px-4",
        default: "h-control-md px-4",
        /* Tam genişlik Generate: h40, 14/400 */
        lg: "h-control-lg px-4 text-body-md",
        xl: "h-control-xl px-5 text-body-md [&_svg]:size-5",
        icon: "h-control-md w-control-md p-0",
        "icon-xs": "h-control-xs w-control-xs p-0 [&_svg]:size-3.5 rounded-sm",
        "icon-sm": "h-control-sm w-control-sm p-0",
        "icon-lg": "h-control-lg w-control-lg p-0 [&_svg]:size-5",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Yükleniyor durumu: genişlik korunur, etkileşim kilitlenir, aria-busy. */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    if (asChild) {
      return <Comp className={cn(buttonVariants({ variant, size, fullWidth, className }))} ref={ref} {...props}>{children}</Comp>;
    }
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <Loader2 className="animate-spin" />
          </span>
        )}
        <span className={cn("contents", loading && "invisible")}>{children}</span>
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
