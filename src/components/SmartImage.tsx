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
  /** Called once when the image has definitely failed (after retries). */
  onFinalError?: () => void;
  /** Called when the image successfully loads. */
  onLoaded?: () => void;
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
  onFinalError,
  onLoaded,
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
      <div className={cn("relative grid place-items-center bg-control", className)} role="img" aria-label={alt || "Image unavailable"}>
        <ImageOff className="size-5 text-tertiary-foreground" strokeWidth={1.5} aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {!loaded && !failed && (
        <div className="absolute inset-0 skeleton rounded-none" aria-hidden="true" />
      )}
      {failed && (
        <div className="absolute inset-0 grid place-items-center bg-control" role="img" aria-label="Image failed to load">
          <ImageOff className="size-5 text-tertiary-foreground" strokeWidth={1.5} aria-hidden="true" />
        </div>
      )}
      <img
        src={currentSrc}
        alt={alt}
        loading={loading}
        className={cn(
          "w-full h-full transition-opacity duration-fast ease-standard",
          fit === "cover" ? "object-cover" : "object-contain",
          loaded && !failed ? "opacity-100" : "opacity-0"
        )}
        onLoad={() => {
          setLoaded(true);
          setFailed(false);
          onLoaded?.();
        }}
        onError={() => {
          if (attempt >= maxRetries) {
            setLoaded(true);
            setFailed(true);
            onFinalError?.();
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
