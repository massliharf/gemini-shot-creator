import { SmartImage } from "@/components/SmartImage";
import { cn } from "@/lib/utils";
import { packTint } from "@/components/packs/packTint";

interface PackThumbProps {
  name: string;
  src?: string;
  className?: string;
}

/** Small square cover: first generated image, or a tinted tile with the pack's initial. */
export const PackThumb = ({ name, src, className }: PackThumbProps) => (
  <span className={cn("relative block shrink-0 overflow-hidden rounded-md", !src && packTint(name), className)} aria-hidden="true">
    {src ? (
      <SmartImage src={src} alt="" fit="cover" loading="lazy" maxRetries={1} className="size-full" />
    ) : (
      <span className="flex size-full items-center justify-center text-label-md">{name.trim().charAt(0).toUpperCase() || "·"}</span>
    )}
  </span>
);
