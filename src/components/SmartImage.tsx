import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ImageOff } from "lucide-react";

type SmartImageProps = {
  src: string;
  alt: string;
  className?: string;
  /** How the image should fit inside its box */
  fit?: "contain" | "cover";
  loading?: "lazy" | "eager";
  maxRetries?: number;
};

const withCacheBust = (url: string) => {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}t=${Date.now()}`;
};

export function SmartImage({
  src,
  alt,
  className,
  fit = "contain",
  loading = "eager",
  maxRetries = 3,
}: SmartImageProps) {
  const initialSrc = useMemo(() => src, [src]);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setCurrentSrc(src);
    setAttempt(0);
    setLoaded(false);
    setFailed(false);
  }, [initialSrc, src]);

  // If no src, show placeholder immediately
  if (!src) {
    return (
      <div className={cn("relative grid place-items-center bg-muted/20", className)}>
        <ImageOff className="h-6 w-6 text-muted-foreground/40" />
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {!loaded && !failed && (
        <div className="absolute inset-0 grid place-items-center bg-muted/30">
          <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground/70 animate-spin" />
        </div>
      )}
      {failed && (
        <div className="absolute inset-0 grid place-items-center bg-muted/20">
          <ImageOff className="h-6 w-6 text-muted-foreground/40" />
        </div>
      )}
      <img
        src={currentSrc}
        alt={alt}
        loading={loading}
        className={cn(
          "w-full h-full transition-opacity duration-150",
          fit === "cover" ? "object-cover" : "object-contain",
          loaded && !failed ? "opacity-100" : "opacity-0"
        )}
        onLoad={() => {
          setLoaded(true);
          setFailed(false);
        }}
        onError={() => {
          if (attempt >= maxRetries) {
            setLoaded(true);
            setFailed(true);
            return;
          }
          const nextAttempt = attempt + 1;
          setAttempt(nextAttempt);
          setTimeout(() => setCurrentSrc(withCacheBust(src)), 300 * nextAttempt);
        }}
      />
    </div>
  );
}
