/** Category-tinted fills for packs that have no generated image yet (literal classes for Tailwind JIT). */
const TINTS = [
  "bg-cat-image/15 text-cat-image",
  "bg-cat-spaces/15 text-cat-spaces",
  "bg-cat-video/15 text-cat-video",
  "bg-cat-design/15 text-cat-design",
  "bg-cat-audio/15 text-cat-audio",
  "bg-cat-3d/15 text-cat-3d",
];

/** Stable tint for a pack, derived from its name. */
export const packTint = (seed: string) => {
  const text = typeof seed === "string" ? seed : "";
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0;
  return TINTS[Math.abs(hash) % TINTS.length];
};
