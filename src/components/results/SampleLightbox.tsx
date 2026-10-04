import { useState } from "react";
import { FullscreenImageView } from "@/components/FullscreenImageView";
import { downloadImage } from "./download";

export interface LightboxImage {
  url: string;
  title: string;
}

/**
 * Small lightbox controller over FullscreenImageView for a flat list of images.
 * Returns `open(index)` and the element to render.
 */
export const useLightbox = (images: LightboxImage[]) => {
  const [index, setIndex] = useState<number | null>(null);
  const current = index !== null ? images[index] : undefined;
  const hasPrevious = index !== null && index > 0;
  const hasNext = index !== null && index < images.length - 1;

  const element = (
    <FullscreenImageView
      isOpen={index !== null}
      onClose={() => setIndex(null)}
      imageUrl={current?.url ?? null}
      sceneName={current?.title}
      onDownload={current ? () => downloadImage(current.url, current.title) : undefined}
      onPrevious={hasPrevious ? () => setIndex((i) => (i ?? 1) - 1) : undefined}
      onNext={hasNext ? () => setIndex((i) => (i ?? 0) + 1) : undefined}
      hasPrevious={hasPrevious}
      hasNext={hasNext}
    />
  );

  return { open: setIndex as (i: number) => void, element };
};
