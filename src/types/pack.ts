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
// Gemini pricing per 1M tokens (as of 2024)
export const GEMINI_PRICING = {
  "gemini-2.5-flash-image": {
    inputPer1M: 0.10,   // $0.10 per 1M input tokens
    outputPer1M: 0.40,  // $0.40 per 1M output tokens
    imagePer1K: 0.02,   // $0.02 per 1K images generated
  },
  "gemini-3-pro-image-preview": {
    inputPer1M: 1.25,   // $1.25 per 1M input tokens
    outputPer1M: 5.00,  // $5.00 per 1M output tokens
    imagePer1K: 0.03,   // $0.03 per 1K images generated
  },
} as const;

export type GeminiModel = keyof typeof GEMINI_PRICING;

export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
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
  cost: CostBreakdown;
  timestamp: string;
}

// Calculate cost from token usage
export const calculateCost = (
  tokenUsage: TokenUsage,
  model: GeminiModel = "gemini-2.5-flash-image",
  imageCount: number = 1
): CostBreakdown => {
  const pricing = GEMINI_PRICING[model] || GEMINI_PRICING["gemini-2.5-flash-image"];
  
  const inputCost = (tokenUsage.promptTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (tokenUsage.candidatesTokens / 1_000_000) * pricing.outputPer1M;
  const imageCost = (imageCount / 1000) * pricing.imagePer1K;
  
  return {
    inputCost,
    outputCost,
    imageCost,
    totalCost: inputCost + outputCost + imageCost,
    currency: "USD",
  };
};

// Format cost for display
export const formatCost = (cost: number): string => {
  if (cost < 0.01) {
    return `$${(cost * 100).toFixed(4)}¢`;
  }
  return `$${cost.toFixed(4)}`;
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
