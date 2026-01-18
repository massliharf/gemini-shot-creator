// ========================================
// Visual Asset Pack Schema - V3 Architecture (Universal Visual Architect)
// ========================================
// Structure:
// {
//   "meta": { pack_id, pack_name, description, category, gender, tags, preview_paths },
//   "global_style_anchor": "...",
//   "scenes": [{ id, prompt }]
// }

// ========== Meta ==========
export interface PackMeta {
  pack_id: string;
  pack_name: string;
  description: string;
  category: "Photography" | "3D" | "Art" | "Illustration";
  gender: "unisex" | "woman_only" | "man_only" | "genderless" | "mixed";
  featured?: boolean;
  tags: string[];
  preview_paths: string[];
}

// ========== Scene ==========
export interface Scene {
  id: string;
  prompt: string;
}

// ========== Main Pack Structure (V3) ==========
export interface PackFile {
  meta: PackMeta;
  global_style_anchor: string;
  scenes: Scene[];
}

// ========== Scene Status (for UI) ==========
export type SceneStatus = "idle" | "generating" | "success" | "error";

/** A single version (generation) of a scene image */
export interface SceneVersion {
  imageUrl: string;
  imagePath: string;
  generatedAt: string; // ISO timestamp
  queueId?: string;
}

export interface SceneWithStatus extends Scene {
  title?: string;
  status: SceneStatus;
  error?: string;
  imageUrl?: string;
  /** All previous successful versions of this scene (newest first) */
  versions?: SceneVersion[];
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

export const getPackId = (pack: PackFile | LegacyPackFile): string => {
  if ("meta" in pack) return pack.meta.pack_id;
  if ("package_meta" in pack) return pack.package_meta.pack_id;
  return "";
};

export const getPackName = (pack: PackFile | LegacyPackFile): string => {
  if ("meta" in pack) return pack.meta.pack_name;
  if ("package_meta" in pack) return pack.package_meta.package_name;
  return "";
};

export const getPackDescription = (pack: PackFile | LegacyPackFile): string => {
  if ("meta" in pack) return pack.meta.description;
  if ("package_meta" in pack) return pack.package_meta.description;
  return "";
};

export const getPackGender = (pack: PackFile | LegacyPackFile): string => {
  if ("meta" in pack) return pack.meta.gender;
  if ("package_meta" in pack) return pack.package_meta.gender;
  return "unisex";
};

export const getPackCategory = (pack: PackFile | LegacyPackFile): string => {
  if ("meta" in pack) return (pack.meta.category || "Photography").toLowerCase();
  if ("package_meta" in pack) return (pack.package_meta.style_category || "photography").toLowerCase();
  return "photography";
};

export const getPackTags = (pack: PackFile | LegacyPackFile): string[] => {
  if ("meta" in pack) return pack.meta.tags || [];
  return [];
};

export const getScenes = (pack: PackFile | LegacyPackFile): Scene[] => {
  if ("scenes" in pack && Array.isArray(pack.scenes)) return pack.scenes;
  return [];
};

export const getSceneCount = (pack: PackFile | LegacyPackFile): number => {
  return getScenes(pack).length;
};

export const hasScenes = (pack: PackFile | LegacyPackFile): boolean => {
  return getSceneCount(pack) > 0;
};

export const getGlobalStyleAnchor = (pack: PackFile | LegacyPackFile): string => {
  if ("global_style_anchor" in pack && typeof pack.global_style_anchor === "string") {
    return pack.global_style_anchor;
  }
  // Legacy V2 support
  if ("global_style_anchor" in pack && typeof pack.global_style_anchor === "object") {
    const anchor = pack.global_style_anchor as Record<string, string>;
    return Object.values(anchor).filter(Boolean).join(", ");
  }
  // Legacy V1 support
  if ("style_anchor" in pack && pack.style_anchor?.prompt) {
    return pack.style_anchor.prompt;
  }
  if ("prompt_components" in pack) {
    const pc = pack.prompt_components;
    return [pc?.identity, pc?.style].filter(Boolean).join(" ");
  }
  return "";
};

/**
 * Build the final prompt for image generation
 * Combines global_style_anchor + scene prompt
 * Follows the "Prompt Fusion" pattern from the Python script
 */
export const buildFinalPrompt = (pack: PackFile | LegacyPackFile, sceneId: string): string => {
  const globalStyle = getGlobalStyleAnchor(pack);
  const scenes = getScenes(pack);
  
  const scene = scenes.find(s => s.id === sceneId || s.id === sceneId.padStart(2, "0"));
  if (!scene) throw new Error(`Scene with id "${sceneId}" not found`);
  
  // Prompt Fusion: global_style_anchor + scene.prompt
  // This ensures the global visual DNA is applied to every scene
  return `${globalStyle} ${scene.prompt}`.trim();
};

/**
 * Get config for generation (temperature, top_p)
 */
export const getConfig = (pack: PackFile | LegacyPackFile): { temperature: number; top_p: number } => {
  // V1 legacy pack
  if ("config" in pack && pack.config) {
    return pack.config;
  }
  if ("generation" in pack && pack.generation) {
    return pack.generation;
  }
  
  // Default values
  return { temperature: 0.7, top_p: 0.92 };
};

/**
 * Normalize scene ID
 */
export const normalizeSceneId = (id: string | number | undefined): number => {
  if (id === undefined) return 0;
  return typeof id === "string" ? parseInt(id, 10) : id;
};

// ========== Legacy Support ==========
// For backwards compatibility with V1/V2 packs

export interface LegacyPackageMeta {
  pack_id: string;
  package_name: string;
  gender: string;
  description: string;
  style_category: string;
}

export interface LegacyPackFile {
  package_meta?: LegacyPackageMeta;
  global_style_anchor?: Record<string, string> | string;
  global_face_policy?: Record<string, unknown>;
  global_render_settings?: Record<string, unknown>;
  shots?: Array<{ shot_id: number; title: string; [key: string]: unknown }>;
  // V1 legacy
  config?: { temperature: number; top_p: number };
  prompt_components?: { identity: string; style: string; negative: string };
  generation?: { temperature: number; top_p: number };
  style_anchor?: { prompt: string };
  scenes?: Array<{ id: string; prompt: string; title?: string }>;
  meta?: PackMeta;
}

/**
 * Check if pack is in legacy format (V1 or V2)
 */
export const isLegacyPack = (pack: unknown): pack is LegacyPackFile => {
  if (typeof pack !== "object" || pack === null) return false;
  
  // V2 format (package_meta + shots)
  if ("package_meta" in pack && "shots" in pack) return true;
  
  // V1 format (style_anchor + scenes)
  if ("style_anchor" in pack || "prompt_components" in pack) return true;
  
  return false;
};

/**
 * Convert legacy pack format to new V3 format
 */
export const convertLegacyPack = (legacy: LegacyPackFile): PackFile => {
  // Handle V2 format (package_meta + shots)
  if (legacy.package_meta && legacy.shots) {
    const globalAnchor = typeof legacy.global_style_anchor === "string" 
      ? legacy.global_style_anchor 
      : typeof legacy.global_style_anchor === "object"
        ? Object.values(legacy.global_style_anchor).filter(Boolean).join(", ")
        : "";
    
    return {
      meta: {
        pack_id: legacy.package_meta.pack_id,
        pack_name: legacy.package_meta.package_name,
        description: legacy.package_meta.description || "",
        category: mapCategory(legacy.package_meta.style_category),
        gender: mapGender(legacy.package_meta.gender),
        featured: false,
        tags: [],
        preview_paths: legacy.shots.map((s, i) => `/${legacy.package_meta!.pack_id}/${String(i + 1).padStart(2, "0")}.webp`),
      },
      global_style_anchor: globalAnchor,
      scenes: legacy.shots.map((shot, i) => ({
        id: String(shot.shot_id || i + 1).padStart(2, "0"),
        prompt: extractShotPrompt(shot),
      })),
    };
  }
  
  // Handle V1 format (style_anchor + scenes)
  if (legacy.scenes && legacy.meta) {
    return {
      meta: legacy.meta,
      global_style_anchor: legacy.style_anchor?.prompt || 
        [legacy.prompt_components?.identity, legacy.prompt_components?.style].filter(Boolean).join(" ") || "",
      scenes: legacy.scenes.map(scene => ({
        id: scene.id,
        prompt: scene.prompt,
      })),
    };
  }
  
  // Fallback for minimal legacy
  return {
    meta: {
      pack_id: "unknown",
      pack_name: "Unknown Pack",
      description: "",
      category: "Photography",
      gender: "unisex",
      featured: false,
      tags: [],
      preview_paths: [],
    },
    global_style_anchor: "",
    scenes: [],
  };
};

// Helper functions for conversion
const mapCategory = (category: string): "Photography" | "3D" | "Art" | "Illustration" => {
  const lower = category?.toLowerCase() || "";
  if (lower.includes("3d") || lower.includes("render")) return "3D";
  if (lower.includes("art") || lower.includes("paint") || lower.includes("oil") || lower.includes("water")) return "Art";
  if (lower.includes("illust") || lower.includes("anime") || lower.includes("vector")) return "Illustration";
  return "Photography";
};

const mapGender = (gender: string): "unisex" | "woman_only" | "man_only" | "genderless" | "mixed" => {
  const lower = gender?.toLowerCase() || "";
  if (lower.includes("woman") || lower === "female") return "woman_only";
  if (lower.includes("man") || lower === "male") return "man_only";
  if (lower === "genderless") return "genderless";
  if (lower === "mixed") return "mixed";
  return "unisex";
};

const extractShotPrompt = (shot: Record<string, unknown>): string => {
  // Try direct prompt field
  if (typeof shot.prompt === "string") return shot.prompt;
  
  // Build from shot properties
  const parts: string[] = [];
  
  if (shot.environment && typeof shot.environment === "object") {
    const env = shot.environment as Record<string, string>;
    if (env.details) parts.push(env.details);
    if (env.location) parts.push(`in ${env.location}`);
    if (env.mood) parts.push(env.mood);
  }
  
  if (shot.composition && typeof shot.composition === "object") {
    const comp = shot.composition as Record<string, string>;
    if (comp.angle) parts.push(comp.angle);
    if (comp.framing) parts.push(comp.framing);
  }
  
  if (shot.pose && typeof shot.pose === "object") {
    const pose = shot.pose as Record<string, string>;
    if (pose.body) parts.push(pose.body);
    if (pose.expression) parts.push(pose.expression);
  }
  
  if (shot.wardrobe && typeof shot.wardrobe === "object") {
    const wardrobe = shot.wardrobe as Record<string, string>;
    if (wardrobe.outfit) parts.push(`wearing ${wardrobe.outfit}`);
  }
  
  if (shot.lighting && typeof shot.lighting === "object") {
    const light = shot.lighting as Record<string, string>;
    if (light.type) parts.push(`${light.type} lighting`);
  }
  
  return parts.length > 0 ? parts.join(", ") : String(shot.title || "");
};
