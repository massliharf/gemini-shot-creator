/**
 * Sample content shown on empty pages and in demo mode.
 * Images live in src/assets/mock (colour variations of the three demo shots),
 * so everything renders offline and consistently in screenshots.
 */
import type { PackFile, SceneWithStatus } from "@/types/pack";

const files = import.meta.glob("../assets/mock/*.jpg", { eager: true, import: "default" }) as Record<string, string>;

export type MockImageKey =
  | "portrait-cobalt" | "portrait-blush" | "portrait-tangerine" | "portrait-mint" | "portrait-lilac"
  | "portrait-lemon" | "portrait-crimson" | "portrait-sage"
  | "portrait-close-cobalt" | "portrait-close-blush" | "portrait-close-tangerine"
  | "product-coral" | "product-lilac" | "product-mint" | "product-sky" | "product-lemon" | "product-rose"
  | "product-detail-coral" | "product-detail-lilac"
  | "space-terracotta" | "space-sage" | "space-cobalt" | "space-mustard" | "space-blush" | "space-plum"
  | "space-detail-terracotta" | "space-detail-sage";

/** Resolved URL for a mock image. */
export const mockImage = (key: MockImageKey): string => files[`../assets/mock/${key}.jpg`] ?? "/placeholder.svg";

export const portraitSet: MockImageKey[] = [
  "portrait-blush", "portrait-tangerine", "portrait-lilac", "portrait-mint",
  "portrait-cobalt", "portrait-lemon", "portrait-crimson", "portrait-sage",
];
export const productSet: MockImageKey[] = ["product-coral", "product-lilac", "product-mint", "product-sky", "product-lemon", "product-rose"];
export const spaceSet: MockImageKey[] = ["space-terracotta", "space-sage", "space-cobalt", "space-mustard", "space-blush", "space-plum"];
export const closeSet: MockImageKey[] = ["portrait-close-blush", "portrait-close-cobalt", "portrait-close-tangerine"];

/* --------------------------------------------------------------------------
 * Time helpers
 * ------------------------------------------------------------------------ */
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

export const relativeTime = (iso: string) => {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.round(diff / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  const w = Math.round(d / 7);
  return `${w} week${w === 1 ? "" : "s"} ago`;
};

/* --------------------------------------------------------------------------
 * Creations — results feed (Text to image, Home, Library)
 * ------------------------------------------------------------------------ */
export interface SampleCreation {
  id: string;
  prompt: string;
  model: string;
  aspect: string;
  resolution: string;
  createdAt: string;
  images: MockImageKey[];
  tool: "text-to-image" | "pack-creator" | "generator" | "glasses" | "quote";
}

export const sampleCreations: SampleCreation[] = [
  {
    id: "c1",
    prompt: "Editorial portrait, soft studio light, saturated seamless backdrop, white oversized shirt, gold hoops",
    model: "Pro",
    aspect: "1:1",
    resolution: "2K",
    createdAt: minutesAgo(2),
    images: ["portrait-blush", "portrait-tangerine", "portrait-lilac", "portrait-mint"],
    tool: "text-to-image",
  },
  {
    id: "c2",
    prompt: "Frosted glass perfume bottle on a marble plinth, sculpted coral stone, raking window light",
    model: "Flash",
    aspect: "1:1",
    resolution: "1K",
    createdAt: minutesAgo(64),
    images: ["product-coral", "product-lilac", "product-mint", "product-sky"],
    tool: "text-to-image",
  },
  {
    id: "c3",
    prompt: "Sculptural lounge chair in a sunlit concrete courtyard, olive tree shadows, quiet minimal architecture",
    model: "3.1 Flash",
    aspect: "1:1",
    resolution: "2K",
    createdAt: minutesAgo(60 * 22),
    images: ["space-terracotta", "space-sage", "space-cobalt", "space-mustard"],
    tool: "generator",
  },
  {
    id: "c4",
    prompt: "Beauty close-up, freckles, glossy lips, brushed-up brows, colour-blocked background",
    model: "Pro",
    aspect: "1:1",
    resolution: "4K",
    createdAt: minutesAgo(60 * 50),
    images: ["portrait-close-blush", "portrait-close-cobalt", "portrait-close-tangerine"],
    tool: "text-to-image",
  },
];

/* --------------------------------------------------------------------------
 * Packs — demo content for the Packs page
 * ------------------------------------------------------------------------ */
export interface SamplePack {
  id: string;
  pack: PackFile;
  scenes: SceneWithStatus[];
}

const scenePrompts = {
  portrait: [
    "Hero portrait, direct gaze, seamless pink backdrop",
    "Warm tangerine backdrop, relaxed shoulders, soft key light",
    "Lilac backdrop, editorial calm, crisp white shirt",
    "Mint backdrop, fresh daylight tone, gold hoops in focus",
    "Cobalt backdrop, high-contrast fashion lighting",
    "Lemon backdrop, playful summer campaign mood",
    "Crimson backdrop, dramatic evening palette",
    "Sage backdrop, muted natural skin tones",
  ],
  product: [
    "Coral stone, raking window light, marble plinth",
    "Lilac stone, cool morning light, frosted glass glow",
    "Mint stone, spa-fresh palette, soft reflections",
    "Sky stone, airy blue cast, clean shadows",
    "Lemon stone, sunny citrus mood",
    "Rose stone, romantic blush tones",
  ],
  space: [
    "Terracotta lounge chair, midday courtyard sun",
    "Sage upholstery, olive-leaf shadows",
    "Cobalt upholstery, crisp architectural contrast",
    "Mustard upholstery, golden hour warmth",
    "Blush upholstery, soft diffused light",
    "Plum upholstery, late afternoon mood",
  ],
};

const makeScenes = (prompts: string[], images: MockImageKey[], pending = 0): SceneWithStatus[] =>
  prompts.map((prompt, i) => {
    const isPending = i >= prompts.length - pending;
    return {
      id: String(i + 1),
      title: `Scene ${i + 1}`,
      prompt,
      status: isPending ? (i === prompts.length - 1 ? "idle" : "generating") : "success",
      imageUrl: isPending ? undefined : mockImage(images[i % images.length]),
    };
  });

const packFile = (
  id: string,
  name: string,
  description: string,
  category: PackFile["meta"]["category"],
  gender: PackFile["meta"]["gender"],
  tags: string[],
  prompts: string[],
): PackFile => ({
  meta: { pack_id: id, pack_name: name, description, category, gender, tags, preview_paths: [] },
  global_style_anchor: description,
  scenes: prompts.map((prompt, i) => ({ id: String(i + 1), prompt })),
});

export const samplePacks: SamplePack[] = [
  {
    id: "demo-color-theory",
    pack: packFile(
      "color_theory_editorial",
      "Color Theory — Editorial",
      "One model, eight saturated seamless backdrops. Consistent face, wardrobe and light.",
      "Photography",
      "woman_only",
      ["editorial", "studio", "colour"],
      scenePrompts.portrait,
    ),
    scenes: makeScenes(scenePrompts.portrait, portraitSet),
  },
  {
    id: "demo-still-life",
    pack: packFile(
      "still_life_fragrance",
      "Still Life — Fragrance",
      "Hero bottle on marble with a sculpted stone, re-coloured for every campaign colourway.",
      "Photography",
      "genderless",
      ["product", "beauty", "campaign"],
      scenePrompts.product,
    ),
    scenes: makeScenes(scenePrompts.product, productSet, 2),
  },
  {
    id: "demo-courtyard",
    pack: packFile(
      "courtyard_living",
      "Courtyard Living",
      "A furniture hero in sunlit concrete architecture — six upholstery options.",
      "3D",
      "genderless",
      ["interior", "furniture", "architecture"],
      scenePrompts.space,
    ),
    scenes: makeScenes(scenePrompts.space, spaceSet),
  },
  {
    id: "demo-close-beauty",
    pack: packFile(
      "close_beauty",
      "Close Beauty",
      "Tight beauty crops with natural skin texture.",
      "Photography",
      "woman_only",
      ["beauty", "close-up"],
      ["Freckles and gloss, blush backdrop", "Cool cobalt backdrop, sharp brows", "Warm tangerine backdrop, golden skin"],
    ),
    scenes: makeScenes(
      ["Freckles and gloss, blush backdrop", "Cool cobalt backdrop, sharp brows", "Warm tangerine backdrop, golden skin"],
      closeSet,
    ),
  },
];

/* --------------------------------------------------------------------------
 * Projects (Home)
 * ------------------------------------------------------------------------ */
export type CategoryKey = "image" | "video" | "audio" | "design" | "3d" | "spaces";

export interface SampleProject {
  id: string;
  name: string;
  category: CategoryKey;
  items: number;
  updatedAt: string;
  covers: MockImageKey[];
  shared?: boolean;
}

export const sampleProjects: SampleProject[] = [
  { id: "p1", name: "Spring campaign", category: "spaces", items: 48, updatedAt: minutesAgo(12), covers: ["portrait-blush", "portrait-mint", "portrait-lilac"], shared: true },
  { id: "p2", name: "Fragrance launch", category: "image", items: 24, updatedAt: minutesAgo(130), covers: ["product-coral", "product-sky", "product-lilac"] },
  { id: "p3", name: "Furniture catalogue", category: "3d", items: 36, updatedAt: minutesAgo(60 * 26), covers: ["space-terracotta", "space-sage", "space-cobalt"], shared: true },
  { id: "p4", name: "Beauty close-ups", category: "design", items: 12, updatedAt: minutesAgo(60 * 72), covers: ["portrait-close-blush", "portrait-close-cobalt", "portrait-close-tangerine"] },
];

/* --------------------------------------------------------------------------
 * Templates & use cases (Explore, Home)
 * ------------------------------------------------------------------------ */
export interface SampleTemplate {
  id: string;
  title: string;
  kind: "Flow" | "Template";
  category: CategoryKey;
  section: "featured" | "use-case" | "template";
  description: string;
  prompt: string;
  /** Route the template opens; it must read `?prompt=` (Pack Creator, Text to Image). */
  path: string;
  cover: MockImageKey;
  gallery?: MockImageKey[];
  uses: number;
  author: string;
  isNew?: boolean;
}

export const sampleTemplates: SampleTemplate[] = [
  {
    id: "t1", title: "Colour-block editorial", kind: "Flow", category: "spaces", section: "featured",
    description: "Eight backdrops, one consistent model.", path: "/pack-creator",
    prompt: "Editorial portrait on a saturated seamless backdrop, soft key light, white shirt",
    cover: "portrait-blush", gallery: ["portrait-tangerine", "portrait-lilac", "portrait-mint"], uses: 12840, author: "Lumra", isNew: true,
  },
  {
    id: "t2", title: "Fragrance colourways", kind: "Template", category: "image", section: "featured",
    description: "Recolour a hero product for every SKU.", path: "/text-to-image",
    prompt: "Frosted glass perfume bottle on marble, sculpted stone accent, raking light",
    cover: "product-lilac", gallery: ["product-coral", "product-mint", "product-sky"], uses: 9310, author: "Studio Ora",
  },
  {
    id: "t3", title: "Architectural interiors", kind: "Flow", category: "3d", section: "featured",
    description: "Furniture heroes in sunlit concrete.", path: "/pack-creator",
    prompt: "Sculptural lounge chair in a sunlit concrete courtyard, olive shadows",
    cover: "space-sage", gallery: ["space-terracotta", "space-cobalt", "space-mustard"], uses: 7450, author: "Lumra",
  },
  {
    id: "t4", title: "Beauty close-up", kind: "Template", category: "design", section: "use-case",
    description: "Natural skin texture, glossy finish.", path: "/text-to-image",
    prompt: "Beauty close-up, freckles, glossy lips, brushed-up brows, colour backdrop",
    cover: "portrait-close-tangerine", uses: 5210, author: "Mira K.",
  },
  {
    id: "t5", title: "Campaign key visual", kind: "Template", category: "image", section: "use-case",
    description: "Bold colour, one hero, lots of space for type.", path: "/text-to-image",
    prompt: "Fashion campaign key visual, cobalt backdrop, high contrast light, negative space",
    cover: "portrait-cobalt", uses: 4890, author: "Lumra",
  },
  {
    id: "t6", title: "Product on plinth", kind: "Flow", category: "spaces", section: "use-case",
    description: "Marble, stone and light — the classic still life.", path: "/pack-creator",
    prompt: "Product still life on a marble plinth with a sculpted stone, window light",
    cover: "product-detail-coral", uses: 3920, author: "Studio Ora", isNew: true,
  },
  {
    id: "t7", title: "Interior detail crops", kind: "Template", category: "3d", section: "use-case",
    description: "Tight, tactile crops for social.", path: "/text-to-image",
    prompt: "Close crop of an upholstered lounge chair on polished concrete, soft shadows",
    cover: "space-detail-sage", uses: 2870, author: "Atelier N",
  },
  {
    id: "t8", title: "Summer lookbook", kind: "Flow", category: "spaces", section: "use-case",
    description: "Sunny palettes for a seasonal drop.", path: "/pack-creator",
    prompt: "Lookbook portrait on a lemon backdrop, playful summer energy",
    cover: "portrait-lemon", uses: 2650, author: "Lumra",
  },
  {
    id: "t9", title: "Moody evening palette", kind: "Template", category: "design", section: "template",
    description: "Deep reds and dramatic light.", path: "/text-to-image",
    prompt: "Editorial portrait, crimson backdrop, dramatic evening light",
    cover: "portrait-crimson", uses: 2210, author: "Mira K.",
  },
  {
    id: "t10", title: "Spa-fresh product", kind: "Template", category: "image", section: "template",
    description: "Mint tones and soft reflections.", path: "/text-to-image",
    prompt: "Frosted bottle with mint stone, spa-fresh palette, soft reflections",
    cover: "product-mint", uses: 1980, author: "Studio Ora",
  },
  {
    id: "t11", title: "Golden hour interior", kind: "Flow", category: "3d", section: "template",
    description: "Warm light through concrete openings.", path: "/pack-creator",
    prompt: "Mustard lounge chair, golden hour light through a concrete courtyard",
    cover: "space-mustard", uses: 1730, author: "Atelier N",
  },
  {
    id: "t12", title: "Muted naturals", kind: "Template", category: "spaces", section: "template",
    description: "Sage and stone, calm and quiet.", path: "/text-to-image",
    prompt: "Portrait on a sage backdrop, muted natural skin tones, soft daylight",
    cover: "portrait-sage", uses: 1520, author: "Lumra",
  },
];

/* --------------------------------------------------------------------------
 * Notifications
 * ------------------------------------------------------------------------ */
export interface SampleNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  unread: boolean;
  image?: MockImageKey;
  kind: "done" | "shared" | "tip" | "credits";
}

export const sampleNotifications: SampleNotification[] = [
  { id: "n1", kind: "done", title: "Color Theory — Editorial is ready", body: "8 of 8 scenes generated in 1m 42s", createdAt: minutesAgo(3), unread: true, image: "portrait-blush" },
  { id: "n2", kind: "shared", title: "Deniz shared “Fragrance launch”", body: "You can now edit this project", createdAt: minutesAgo(48), unread: true, image: "product-lilac" },
  { id: "n3", kind: "tip", title: "New: Explore templates", body: "Start from 120+ ready-made flows", createdAt: minutesAgo(60 * 5), unread: false },
  { id: "n4", kind: "credits", title: "Credits topped up", body: "2,000 credits added to your workspace", createdAt: minutesAgo(60 * 30), unread: false },
];

/* --------------------------------------------------------------------------
 * Styles, library and usage samples
 * ------------------------------------------------------------------------ */
export interface SampleStyle {
  id: string;
  name: string;
  scenes: number;
  category: string;
  covers: MockImageKey[];
  updatedAt: string;
}

export const sampleStyles: SampleStyle[] = [
  { id: "s1", name: "Color Theory", scenes: 8, category: "Photography", covers: ["portrait-blush", "portrait-mint", "portrait-tangerine", "portrait-lilac"], updatedAt: minutesAgo(30) },
  { id: "s2", name: "Marble Still Life", scenes: 6, category: "Photography", covers: ["product-coral", "product-sky", "product-mint", "product-rose"], updatedAt: minutesAgo(60 * 4) },
  { id: "s3", name: "Concrete Courtyard", scenes: 6, category: "3D", covers: ["space-terracotta", "space-cobalt", "space-sage", "space-mustard"], updatedAt: minutesAgo(60 * 20) },
  { id: "s4", name: "Close Beauty", scenes: 3, category: "Photography", covers: ["portrait-close-blush", "portrait-close-cobalt", "portrait-close-tangerine", "portrait-crimson"], updatedAt: minutesAgo(60 * 48) },
  { id: "s5", name: "Evening Palette", scenes: 5, category: "Art", covers: ["portrait-crimson", "space-plum", "product-rose", "portrait-cobalt"], updatedAt: minutesAgo(60 * 96) },
  { id: "s6", name: "Citrus Summer", scenes: 4, category: "Illustration", covers: ["portrait-lemon", "product-lemon", "space-mustard", "portrait-tangerine"], updatedAt: minutesAgo(60 * 140) },
];

export interface SampleFolder {
  id: string;
  name: string;
  files: number;
  sizeMb: number;
  createdAt: string;
  covers: MockImageKey[];
}

export const sampleFolders: SampleFolder[] = [
  { id: "f1", name: "color_theory_editorial", files: 8, sizeMb: 18.4, createdAt: minutesAgo(4), covers: ["portrait-blush", "portrait-tangerine", "portrait-lilac", "portrait-mint"] },
  { id: "f2", name: "still_life_fragrance", files: 6, sizeMb: 11.2, createdAt: minutesAgo(70), covers: ["product-coral", "product-lilac", "product-mint", "product-sky"] },
  { id: "f3", name: "courtyard_living", files: 6, sizeMb: 14.9, createdAt: minutesAgo(60 * 23), covers: ["space-terracotta", "space-sage", "space-cobalt", "space-mustard"] },
  { id: "f4", name: "close_beauty", files: 3, sizeMb: 9.6, createdAt: minutesAgo(60 * 51), covers: ["portrait-close-blush", "portrait-close-cobalt", "portrait-close-tangerine", "portrait-crimson"] },
  { id: "f5", name: "citrus_summer", files: 4, sizeMb: 7.1, createdAt: minutesAgo(60 * 120), covers: ["portrait-lemon", "product-lemon", "space-mustard", "portrait-tangerine"] },
];

export interface UsagePoint {
  date: string; // YYYY-MM-DD
  cost: number;
  images: number;
  tokens: number;
}

/** 30 days of plausible usage, newest last. Deterministic (no Math.random). */
export const sampleUsage: UsagePoint[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(Date.now() - (29 - i) * 86_400_000);
  const wave = Math.sin(i / 3.2) * 0.5 + 0.5;
  const trend = 0.5 + i / 40;
  const weekend = [0, 6].includes(d.getDay()) ? 0.55 : 1;
  const images = Math.round((18 + wave * 34) * trend * weekend);
  return {
    date: d.toISOString().slice(0, 10),
    images,
    cost: +(images * 0.061).toFixed(2),
    tokens: images * 1290 + Math.round(wave * 4200),
  };
});

export const sampleUsageByModel = [
  { model: "Gemini 3 Pro Image", images: 412, cost: 55.21 },
  { model: "Gemini 3.1 Flash Image", images: 655, cost: 25.55 },
  { model: "Gemini 2.5 Flash Image", images: 318, cost: 12.4 },
];

export const samplePromptIdeas = [
  "Editorial portrait on a lilac seamless, soft key light",
  "Perfume bottle on marble with a coral stone",
  "Lounge chair in a sunlit concrete courtyard",
  "Beauty close-up with freckles and glossy lips",
];
