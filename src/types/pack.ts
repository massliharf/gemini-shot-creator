// ========================================
// Style Pack Schema - New Architecture
// ========================================
// Based on Visual Alchemist structure:
// {
//   "meta": {},
//   "config": { temperature, top_p },
//   "prompt_components": { identity, style, negative },
//   "scenes": [{ id, title, prompt }]
// }

// ========== Meta Section ==========
export interface PackMeta {
  pack_id: string;           // snake_case unique identifier
  pack_name: string;         // Human readable display name
  title?: string;            // Marketing title
  description: string;       // Short user-facing description
  gender: "any" | "woman_only" | "man_only" | "genderless";
  category: PackCategory;
  tags: string[];            // Descriptive keywords
  cover_image?: string;      // Cover image URL
  preview_paths: string[];   // Preview image paths
}

export type PackCategory = "photography" | "illustration" | "3d_render" | "painting" | "anime" | "cinematic" | "art";

// ========== Config ==========
export interface PackConfig {
  temperature: number;       // 0.6-0.85 depending on style
  top_p: number;             // 0.88-0.95 depending on style
}

// ========== Prompt Components (NEW) ==========
export interface PromptComponents {
  identity: string;          // Face preservation / identity instructions
  style: string;             // Visual language, lighting, texture
  negative: string;          // Semantic negatives (what to avoid)
}

// ========== Scene Item ==========
export interface SceneItem {
  id: string;                // "01", "02", etc.
  title: string;             // Scene title
  prompt: string;            // Scene-specific narrative (starts with "The subject is...")
}

// ========== Main Pack Structure (NEW) ==========
export interface PackFile {
  meta: PackMeta;
  config: PackConfig;
  prompt_components: PromptComponents;
  scenes: SceneItem[];
}

// ========== Legacy Support (Old Format) ==========
export interface LegacyPackFile {
  meta: PackMeta;
  generation?: { temperature: number; top_p: number };
  style_anchor?: { prompt: string };
  scenes: Array<{ id: string; prompt: string; title?: string }>;
}

// ========== Scene Status (for UI) ==========
export type SceneStatus = "idle" | "generating" | "success" | "error";

export interface SceneWithStatus {
  id: string;
  title: string;
  prompt: string;
  status: SceneStatus;
  error?: string;
  imageUrl?: string;
}

// ========== Generation Results ==========
export interface GenerationResult {
  success: boolean;
  imageUrl?: string;
  imageBase64?: string;
  imagePath?: string;
  mimeType?: string;
  reason?: string;
  message?: string;
  tokenUsage?: TokenUsage;
}

export interface TokenUsage {
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
}

// ========== Cost Calculation ==========
export const GEMINI_IMAGE_PRICING = {
  "gemini-2.5-flash-image": {
    inputPer1M: 0.30,
    outputPerImage: 0.039,
    name: "Flash Image",
  },
  "gemini-3-pro-image-preview": {
    inputPer1M: 2.00,
    outputPerImage1K2K: 0.134,
    outputPerImage4K: 0.24,
    name: "Pro Image Preview",
  },
} as const;

export type GeminiModel = keyof typeof GEMINI_IMAGE_PRICING;

export interface CostBreakdown {
  inputCost: number;
  imageCost: number;
  totalCost: number;
  currency: "USD";
}

export interface PackGenerationStats {
  packId: string;
  packName: string;
  totalTokensUsed: number;
  promptTokensUsed: number;
  candidatesTokensUsed: number;
  imagesGenerated: number;
  scenesGenerated: number;
  model: GeminiModel;
  resolution: "1K" | "2K" | "4K";
  cost: CostBreakdown;
  timestamp: string;
}

export const calculateImageCost = (
  promptTokens: number,
  model: GeminiModel = "gemini-2.5-flash-image",
  imageCount: number = 1,
  resolution: "1K" | "2K" | "4K" = "1K"
): CostBreakdown => {
  const pricing = GEMINI_IMAGE_PRICING[model];
  const inputCost = (promptTokens / 1_000_000) * pricing.inputPer1M;
  
  let imageCost: number;
  if (model === "gemini-3-pro-image-preview") {
    const proPrice = GEMINI_IMAGE_PRICING["gemini-3-pro-image-preview"];
    const perImage = resolution === "4K" 
      ? proPrice.outputPerImage4K 
      : proPrice.outputPerImage1K2K;
    imageCost = imageCount * perImage;
  } else {
    const flashPrice = GEMINI_IMAGE_PRICING["gemini-2.5-flash-image"];
    imageCost = imageCount * flashPrice.outputPerImage;
  }
  
  return {
    inputCost,
    imageCost,
    totalCost: inputCost + imageCost,
    currency: "USD",
  };
};

export const formatCost = (cost: number): string => {
  if (cost < 0.001) {
    return `$${(cost * 1000).toFixed(3)}m`;
  }
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  return `$${cost.toFixed(3)}`;
};

// ========== Helper Functions ==========

export const getPackId = (pack: PackFile): string => pack.meta.pack_id;
export const getPackName = (pack: PackFile): string => pack.meta.pack_name;
export const getPackTitle = (pack: PackFile): string => pack.meta.title || pack.meta.pack_name;
export const getPackDescription = (pack: PackFile): string => pack.meta.description;
export const getPackGender = (pack: PackFile): string => pack.meta.gender;
export const getPackCategory = (pack: PackFile): string => pack.meta.category;
export const getPackTags = (pack: PackFile): string[] => pack.meta.tags || [];
export const getScenes = (pack: PackFile): SceneItem[] => pack.scenes || [];
export const getSceneCount = (pack: PackFile): number => pack.scenes?.length || 0;
export const hasScenes = (pack: PackFile): boolean => pack.scenes && pack.scenes.length > 0;

export const getConfig = (pack: PackFile): PackConfig => {
  return pack.config || { temperature: 0.70, top_p: 0.95 };
};

export const getPromptComponents = (pack: PackFile): PromptComponents => {
  return pack.prompt_components || {
    identity: "",
    style: "",
    negative: "",
  };
};

/**
 * Build the final prompt for image generation
 * NEW FORMAT: identity + scene.prompt + style + negative
 */
export const buildFinalPrompt = (pack: PackFile, sceneId: string): string => {
  const scene = pack.scenes.find(s => s.id === sceneId || s.id === sceneId.padStart(2, "0"));
  
  if (!scene) {
    throw new Error(`Scene with id "${sceneId}" not found in pack`);
  }
  
  const components = getPromptComponents(pack);
  
  // Build: identity + scene prompt + style + negative
  const parts: string[] = [];
  
  if (components.identity) {
    parts.push(components.identity);
  }
  
  parts.push(scene.prompt);
  
  if (components.style) {
    parts.push(components.style);
  }
  
  if (components.negative) {
    parts.push(components.negative);
  }
  
  return parts.join("\n\n");
};

/**
 * Get scene by ID
 */
export const getScene = (pack: PackFile, sceneId: string): SceneItem | null => {
  return pack.scenes.find(s => s.id === sceneId || s.id === sceneId.padStart(2, "0")) || null;
};

/**
 * Normalize scene ID to consistent format
 */
export const normalizeSceneId = (id: string | number): number => {
  if (typeof id === "number") return id;
  return parseInt(id, 10);
};

/**
 * Convert legacy pack format to new format
 */
export const convertLegacyPack = (legacy: LegacyPackFile): PackFile => {
  return {
    meta: {
      ...legacy.meta,
      title: legacy.meta.title || legacy.meta.pack_name,
    },
    config: legacy.generation || { temperature: 0.7, top_p: 0.95 },
    prompt_components: {
      identity: legacy.style_anchor?.prompt || "",
      style: "",
      negative: "",
    },
    scenes: legacy.scenes.map(s => ({
      id: s.id,
      title: s.title || `Scene ${s.id}`,
      prompt: s.prompt,
    })),
  };
};

/**
 * Check if pack is in legacy format
 */
export const isLegacyPack = (pack: unknown): pack is LegacyPackFile => {
  return typeof pack === "object" && pack !== null && 
    ("style_anchor" in pack || "generation" in pack) && 
    !("prompt_components" in pack);
};
