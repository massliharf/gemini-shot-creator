import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type SmartImageProps = {
  src: string;
  alt: string;
  className?: string;
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
  loading = "eager", // Changed to eager for faster loading
  maxRetries = 3,
}: SmartImageProps) {
  const initialSrc = useMemo(() => src, [src]);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setCurrentSrc(src);
    setAttempt(0);
    setLoaded(false);
  }, [initialSrc, src]);

  return (
    <div className={cn("relative", className)}>
      {!loaded && (
        <div className="absolute inset-0 grid place-items-center bg-muted/30">
          <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground/70 animate-spin" />
        </div>
      )}
      <img
        src={currentSrc}
        alt={alt}
        loading={loading}
        className={cn("w-full h-full object-contain transition-opacity duration-150", loaded ? "opacity-100" : "opacity-0")}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (attempt >= maxRetries) {
            setLoaded(true);
            return;
          }
          const nextAttempt = attempt + 1;
          setAttempt(nextAttempt);
          // Faster retry: 300ms instead of 800ms
          setTimeout(() => setCurrentSrc(withCacheBust(src)), 300 * nextAttempt);
        }}
      />
    </div>
  );
}
