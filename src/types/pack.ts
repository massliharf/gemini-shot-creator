// ========================================
// Style Pack Schema - Clean Architecture
// ========================================

// ========== Meta Section ==========
export interface PackMeta {
  pack_id: string;           // snake_case unique identifier
  pack_name: string;         // Human readable display name
  gender: "any" | "woman_only" | "man_only" | "genderless";
  category: PackCategory;
  tags: string[];            // 5-7 descriptive keywords
  description: string;       // 2-3 sentences describing the visual style
  preview_paths: string[];   // Preview image paths
}

export type PackCategory = "photography" | "illustration" | "3d_render" | "painting" | "anime" | "cinematic";

// ========== Generation Config ==========
export interface GenerationConfig {
  temperature: number;       // 0.6-0.85 depending on style
  top_p: number;             // 0.88-0.95 depending on style
}

// ========== Style Anchor ==========
export interface StyleAnchor {
  prompt: string;            // Complete visual DNA with face preservation first
}

// ========== Scene Item ==========
export interface SceneItem {
  id: string;                // "01", "02", etc.
  prompt: string;            // Scene-specific narrative (starts with "subject")
}

// ========== Main Pack Structure ==========
export interface PackFile {
  meta: PackMeta;
  generation: GenerationConfig;
  style_anchor: StyleAnchor;
  scenes: SceneItem[];
}

// ========== Scene Status (for UI) ==========
export type SceneStatus = "idle" | "generating" | "success" | "error";

export interface SceneWithStatus {
  id: string;
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
// Gemini IMAGE GENERATION pricing (per Google official docs Jan 2025)
// These are IMAGE models, not text models - pricing is per image, not per token
export const GEMINI_IMAGE_PRICING = {
  "gemini-2.5-flash-image": {
    inputPer1M: 0.30,        // $0.30 per 1M input tokens (text/image)
    outputPerImage: 0.039,   // $0.039 per output image (up to 1024x1024)
    name: "Flash Image",
  },
  "gemini-3-pro-image-preview": {
    inputPer1M: 2.00,        // $2.00 per 1M input tokens
    outputPerImage1K2K: 0.134, // $0.134 per 1K/2K image
    outputPerImage4K: 0.24,    // $0.24 per 4K image
    name: "Pro Image Preview",
  },
} as const;

export type GeminiModel = keyof typeof GEMINI_IMAGE_PRICING;

export interface CostBreakdown {
  inputCost: number;      // Token-based input cost
  imageCost: number;      // Per-image output cost
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

// Calculate cost from token usage and image count
export const calculateImageCost = (
  promptTokens: number,
  model: GeminiModel = "gemini-2.5-flash-image",
  imageCount: number = 1,
  resolution: "1K" | "2K" | "4K" = "1K"
): CostBreakdown => {
  const pricing = GEMINI_IMAGE_PRICING[model];
  
  // Input cost based on prompt tokens
  const inputCost = (promptTokens / 1_000_000) * pricing.inputPer1M;
  
  // Image cost based on model and resolution
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

// Format cost for display
export const formatCost = (cost: number): string => {
  if (cost < 0.001) {
    return `$${(cost * 1000).toFixed(3)}m`; // millicents
  }
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  return `$${cost.toFixed(3)}`;
};

// ========== Helper Functions ==========

export const getPackId = (pack: PackFile): string => pack.meta.pack_id;
export const getPackName = (pack: PackFile): string => pack.meta.pack_name;
export const getPackDescription = (pack: PackFile): string => pack.meta.description;
export const getPackGender = (pack: PackFile): string => pack.meta.gender;
export const getPackCategory = (pack: PackFile): string => pack.meta.category;
export const getPackTags = (pack: PackFile): string[] => pack.meta.tags || [];
export const getStyleAnchor = (pack: PackFile): string => pack.style_anchor?.prompt || "";
export const getScenes = (pack: PackFile): SceneItem[] => pack.scenes || [];
export const getSceneCount = (pack: PackFile): number => pack.scenes?.length || 0;
export const hasScenes = (pack: PackFile): boolean => pack.scenes && pack.scenes.length > 0;
export const getGenerationConfig = (pack: PackFile): GenerationConfig => {
  return pack.generation || { temperature: 0.70, top_p: 0.92 };
};

/**
 * Build the final prompt for image generation
 * Following the API guide: scene.prompt + style_anchor.prompt
 */
export const buildFinalPrompt = (pack: PackFile, sceneId: string): string => {
  const scene = pack.scenes.find(s => s.id === sceneId || s.id === sceneId.padStart(2, "0"));
  
  if (!scene) {
    throw new Error(`Scene with id "${sceneId}" not found in pack`);
  }
  
  // Concatenate: scene prompt + style_anchor prompt
  return `${scene.prompt} ${pack.style_anchor.prompt}`;
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
