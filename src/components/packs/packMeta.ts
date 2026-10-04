import {
  type LegacyPackFile,
  type PackFile,
  getPackCategory,
  getPackDescription,
  getPackGender,
  getPackId,
  getPackName,
  getPackTags,
  getScenes,
} from "@/types/pack";

/**
 * Render-safe readers for pack meta.
 *
 * pack_data is stored JSON (pasted, LLM-written or legacy), so `meta` can be missing or null
 * and its fields can have the wrong type. These wrap the `@/types/pack` helpers so a malformed
 * pack falls back to a neutral value instead of throwing while the page renders.
 */
type AnyPack = PackFile | LegacyPackFile | null | undefined;

const attempt = (read: () => unknown): unknown => {
  try {
    return read();
  } catch {
    return undefined;
  }
};

const asText = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
};

const isPackObject = (pack: AnyPack): pack is PackFile | LegacyPackFile =>
  typeof pack === "object" && pack !== null && !Array.isArray(pack);

const read = (pack: AnyPack, getter: (p: PackFile | LegacyPackFile) => unknown): unknown =>
  isPackObject(pack) ? attempt(() => getter(pack)) : undefined;

export const safePackId = (pack: AnyPack): string => asText(read(pack, getPackId));

export const safePackName = (pack: AnyPack, fallback = "Untitled pack"): string =>
  asText(read(pack, getPackName)).trim() || fallback;

export const safePackDescription = (pack: AnyPack): string => asText(read(pack, getPackDescription)).trim();

/** Lower-cased category ("photography", "3d", …), defaulting to photography like getPackCategory. */
export const safePackCategory = (pack: AnyPack): string =>
  asText(read(pack, getPackCategory)).trim().toLowerCase() || "photography";

/** Raw gender key ("unisex", "woman_only", …), or "" when the pack doesn't say. */
export const safePackGender = (pack: AnyPack): string => asText(read(pack, getPackGender)).trim();

/** Tags as unique, non-empty strings. Accepts a comma-separated string from hand-written JSON. */
export const safePackTags = (pack: AnyPack): string[] => {
  const raw = read(pack, getPackTags);
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : [];
  const tags = list.map(asText).map((t) => t.trim()).filter(Boolean);
  return Array.from(new Set(tags));
};

/** Number of usable (object) scenes — matches what usePacks turns into scene cards. */
export const safeSceneCount = (pack: AnyPack): number => {
  const scenes = read(pack, getScenes);
  return Array.isArray(scenes) ? scenes.filter((scene) => scene && typeof scene === "object").length : 0;
};

/** Display label for a category key: "3d" → "3D", "photography" → "Photography". */
export const formatPackCategory = (category: string): string =>
  category === "3d" ? "3D" : category.charAt(0).toUpperCase() + category.slice(1);
