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
  loading = "lazy",
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
          <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground/70 animate-spin" />
        </div>
      )}
      <img
        src={currentSrc}
        alt={alt}
        loading={loading}
        className={cn("w-full h-full object-contain", loaded ? "opacity-100" : "opacity-0")}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (attempt >= maxRetries) {
            setLoaded(true); // stop spinner; browser will show broken image icon
            return;
          }
          const nextAttempt = attempt + 1;
          setAttempt(nextAttempt);
          // storage sometimes becomes available a moment later; retry with cache-bust
          setTimeout(() => setCurrentSrc(withCacheBust(src)), 800 * nextAttempt);
        }}
      />
    </div>
  );
}
