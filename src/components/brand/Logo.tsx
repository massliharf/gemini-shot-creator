import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Lumra mark — a lowercase "l" beside a glowing orb of light (lumen).
 * The orb carries the brand gradient (pink → violet → blue); everything else
 * stays neutral, so the mark sits quietly in the grey Magnific-style shell.
 */
export const LogoMark = ({ size = 32, className, title }: { size?: number; className?: string; title?: string }) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = (name: string) => `lm${name}${uid}`;
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <linearGradient id={id("bg")} x1="32" y1="0" x2="32" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2E2E2E" />
          <stop offset="1" stopColor="#0B0B0B" />
        </linearGradient>
        <radialGradient
          id={id("glow")}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(41 42) rotate(90) scale(20)"
        >
          <stop stopColor="#FF57AE" stopOpacity=".7" />
          <stop offset=".45" stopColor="#8566DC" stopOpacity=".28" />
          <stop offset="1" stopColor="#4F69F2" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id={id("orb")}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(37.5 37.5) rotate(45) scale(14)"
        >
          <stop stopColor="#FFD6EC" />
          <stop offset=".28" stopColor="#FF57AE" />
          <stop offset=".68" stopColor="#8566DC" />
          <stop offset="1" stopColor="#4F69F2" />
        </radialGradient>
        <linearGradient id={id("bar")} x1="21" y1="12" x2="21" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#DCDCDC" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#${id("bg")})`} />
      <rect x=".75" y=".75" width="62.5" height="62.5" rx="17.25" stroke="#FFFFFF" strokeOpacity=".1" strokeWidth="1.5" />
      <circle cx="41" cy="42" r="20" fill={`url(#${id("glow")})`} />
      <rect x="16.5" y="12" width="9.5" height="40" rx="4.75" fill={`url(#${id("bar")})`} />
      <circle cx="41" cy="42" r="10" fill={`url(#${id("orb")})`} />
      <ellipse cx="37.6" cy="38.4" rx="2.9" ry="2.2" transform="rotate(-35 37.6 38.4)" fill="#FFFFFF" fillOpacity=".8" />
    </svg>
  );
};

/** Mark + "lumra" wordmark. */
export const Logo = ({ size = 28, className, wordmarkClassName }: { size?: number; className?: string; wordmarkClassName?: string }) => (
  <span className={cn("inline-flex items-center gap-2", className)}>
    <LogoMark size={size} />
    <span
      className={cn("font-semibold tracking-[-0.045em] text-foreground leading-none", wordmarkClassName)}
      style={{ fontSize: Math.round(size * 0.78) }}
    >
      lumra
    </span>
  </span>
);
