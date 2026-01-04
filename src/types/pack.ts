// ========================================
// Visual Asset Pack Schema - V2 Architecture
// ========================================
// Structure:
// {
//   "preview_images": [],
//   "package_meta": {},
//   "global_face_policy": {},
//   "global_render_settings": {},
//   "shots": []
// }

// ========== Package Meta ==========
export interface PackageMeta {
  pack_id: string;           // snake_case unique identifier
  package_name: string;      // Human readable display name
  gender: PackGender;
  description: string;       // 3-5 sentences about aesthetic, mood, color palette
  style_category: StyleCategory;
}

export type PackGender = "woman_only" | "man_only" | "genderless" | "mixed";

export type StyleCategory = 
  | "Photography" 
  | "3D Render" 
  | "Digital Illustration" 
  | "Oil Painting" 
  | "Watercolor" 
  | "Anime" 
  | "Vector Art";

// ========== Global Face Policy (FIXED) ==========
export interface GlobalFacePolicy {
  face_source: "uploaded_photo";
  face_reference_image: "uploaded_photo";
  keep_face_structure: true;
  allow_style_adaptation: true;
  allow_genderless_variation: true;
  distortion_protection_level: "maximum";
}

// ========== Global Render Settings ==========
export interface PostProcess {
  exposure: string;
  contrast: string;
  saturation: string;
  finish: "matte" | "glossy" | "textured";
  line_quality: "none" | "clean vector" | "sketch pencil" | "ink outline";
  lighting_style: "natural" | "studio" | "volumetric" | "cel-shaded" | "rim-lit";
  extra_notes: string;
}

export interface GlobalRenderSettings {
  resolution: "4k" | "8k";
  orientation: "portrait" | "landscape" | "square";
  aspect_ratio: "2:3" | "3:4" | "16:9" | "1:1";
  visual_style: string;
  color_profile: string;
  sharpness: "low" | "medium" | "high";
  texture_overlay: "none" | "film grain" | "canvas texture" | "watercolor paper" | "3D noise";
  dynamic_range: "narrow" | "balanced" | "wide";
  rendering_engine: string;
  post_process: PostProcess;
}

// ========== Shot Item ==========
export interface CameraSettings {
  lens?: string;
  aperture?: string;
  shutter_speed?: string;
  iso?: string;
}

export interface LightingSettings {
  type?: string;
  direction?: string;
  quality?: string;
  color?: string;
  hdr_map?: string;
  studio_setup?: string;
  volumetric_fog?: string;
}

export interface RenderSpecs {
  engine?: string;
  material_type?: string;
  reflection?: string;
  subsurface_scattering?: string;
}

export interface Geometry {
  topology_style?: string;
  poly_count_look?: string;
}

export interface ArtMedium {
  tool_type?: string;
  stroke_style?: string;
  paint_thickness?: string;
  drying_effect?: string;
}

export interface LineWork {
  weight?: string;
  style?: string;
  roughness?: string;
}

export interface Canvas {
  background_texture?: string;
  paper_type?: string;
}

export interface Composition {
  angle?: string;
  framing?: string;
  placement?: string;
  perspective?: string;
}

export interface Pose {
  body?: string;
  hands?: string;
  head?: string;
  eyes?: string;
  expression?: string;
}

export interface Wardrobe {
  outfit?: string;
  style?: string;
  colors?: string;
  materials?: string;
}

export interface Environment {
  location?: string;
  details?: string;
  mood?: string;
}

export interface ShotItem {
  shot_id: number;
  title: string;
  // Medium-specific fields (optional based on style)
  camera?: CameraSettings;
  lighting?: LightingSettings;
  render_specs?: RenderSpecs;
  geometry?: Geometry;
  art_medium?: ArtMedium;
  line_work?: LineWork;
  canvas?: Canvas;
  // Common fields
  composition?: Composition;
  pose?: Pose;
  wardrobe?: Wardrobe;
  environment?: Environment;
}

// ========== Main Pack Structure (V2) ==========
export interface PackFile {
  preview_images: string[];
  package_meta: PackageMeta;
  global_face_policy: GlobalFacePolicy;
  global_render_settings: GlobalRenderSettings;
  shots: ShotItem[];
}

// ========== Shot Status (for UI) ==========
export type ShotStatus = "idle" | "generating" | "success" | "error";

export interface ShotWithStatus {
  shot_id: number;
  title: string;
  status: ShotStatus;
  error?: string;
  imageUrl?: string;
  // Include all shot properties
  camera?: CameraSettings;
  lighting?: LightingSettings;
  render_specs?: RenderSpecs;
  geometry?: Geometry;
  art_medium?: ArtMedium;
  line_work?: LineWork;
  canvas?: Canvas;
  composition?: Composition;
  pose?: Pose;
  wardrobe?: Wardrobe;
  environment?: Environment;
}

// ========== Legacy Scene Status (V1 compatibility) ==========
export type SceneStatus = ShotStatus;

export interface SceneWithStatus {
  id: string;
  title: string;
  prompt?: string;
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
  shotsGenerated: number;
  scenesGenerated?: number; // Legacy alias for shotsGenerated
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
  if ("package_meta" in pack) return pack.package_meta.pack_id;
  if ("meta" in pack) return pack.meta.pack_id;
  return "";
};

export const getPackName = (pack: PackFile | LegacyPackFile): string => {
  if ("package_meta" in pack) return pack.package_meta.package_name;
  if ("meta" in pack) return pack.meta.pack_name;
  return "";
};

export const getPackDescription = (pack: PackFile | LegacyPackFile): string => {
  if ("package_meta" in pack) return pack.package_meta.description;
  if ("meta" in pack) return pack.meta.description;
  return "";
};

export const getPackGender = (pack: PackFile | LegacyPackFile): string => {
  if ("package_meta" in pack) return pack.package_meta.gender;
  if ("meta" in pack) return pack.meta.gender;
  return "mixed";
};

export const getStyleCategory = (pack: PackFile): StyleCategory => pack.package_meta.style_category;

export const getPackCategory = (pack: PackFile | LegacyPackFile): string => {
  if ("package_meta" in pack) return pack.package_meta.style_category;
  if ("meta" in pack) return pack.meta.category;
  return "Photography";
};

export const getPackTags = (pack: PackFile | LegacyPackFile): string[] => {
  if ("meta" in pack) return pack.meta.tags || [];
  return [];
};

export const getShots = (pack: PackFile): ShotItem[] => pack.shots || [];
export const getShotCount = (pack: PackFile | LegacyPackFile): number => {
  if ("shots" in pack) return pack.shots?.length || 0;
  if ("scenes" in pack) return pack.scenes?.length || 0;
  return 0;
};

export const hasShots = (pack: PackFile | LegacyPackFile): boolean => {
  if ("shots" in pack) return pack.shots && pack.shots.length > 0;
  if ("scenes" in pack) return pack.scenes && pack.scenes.length > 0;
  return false;
};

// Legacy scene compatibility
export const getScenes = (pack: PackFile | LegacyPackFile): Array<{ id: string; title: string; prompt: string }> => {
  if ("shots" in pack && pack.shots) {
    return pack.shots.map(shot => ({
      id: String(shot.shot_id),
      title: shot.title,
      prompt: shot.environment?.details || "",
    }));
  }
  if ("scenes" in pack && pack.scenes) {
    return pack.scenes.map(scene => ({
      id: scene.id,
      title: scene.title || `Scene ${scene.id}`,
      prompt: scene.prompt || "",
    }));
  }
  return [];
};

export const getSceneCount = (pack: PackFile | LegacyPackFile): number => getShotCount(pack);
export const hasScenes = (pack: PackFile | LegacyPackFile): boolean => hasShots(pack);

export const getRenderSettings = (pack: PackFile): GlobalRenderSettings => {
  return pack.global_render_settings || {
    resolution: "4k",
    orientation: "portrait",
    aspect_ratio: "2:3",
    visual_style: "Cinematic Photo",
    color_profile: "Natural balanced colors",
    sharpness: "high",
    texture_overlay: "none",
    dynamic_range: "wide",
    rendering_engine: "85mm f/1.4",
    post_process: {
      exposure: "0",
      contrast: "medium",
      saturation: "natural",
      finish: "matte",
      line_quality: "none",
      lighting_style: "natural",
      extra_notes: "",
    },
  };
};

export const getFacePolicy = (pack: PackFile): GlobalFacePolicy => {
  return pack.global_face_policy || {
    face_source: "uploaded_photo",
    face_reference_image: "uploaded_photo",
    keep_face_structure: true,
    allow_style_adaptation: true,
    allow_genderless_variation: true,
    distortion_protection_level: "maximum",
  };
};

/**
 * Build the final prompt for image generation from a shot
 * Combines global settings with shot-specific details
 */
export const buildShotPrompt = (pack: PackFile, shotId: number): string => {
  const shot = pack.shots.find(s => s.shot_id === shotId);
  
  if (!shot) {
    throw new Error(`Shot with id "${shotId}" not found in pack`);
  }
  
  const settings = getRenderSettings(pack);
  const parts: string[] = [];
  
  // Visual style and rendering
  parts.push(`${settings.visual_style}, ${settings.color_profile}`);
  parts.push(`${settings.resolution} resolution, ${settings.aspect_ratio} aspect ratio`);
  parts.push(`${settings.rendering_engine}`);
  
  // Shot-specific details
  if (shot.composition) {
    const comp = shot.composition;
    if (comp.angle) parts.push(comp.angle);
    if (comp.framing) parts.push(comp.framing);
    if (comp.perspective) parts.push(comp.perspective);
  }
  
  if (shot.pose) {
    const pose = shot.pose;
    if (pose.body) parts.push(pose.body);
    if (pose.expression) parts.push(pose.expression);
  }
  
  if (shot.wardrobe) {
    const wardrobe = shot.wardrobe;
    if (wardrobe.outfit) parts.push(`wearing ${wardrobe.outfit}`);
    if (wardrobe.style) parts.push(wardrobe.style);
  }
  
  if (shot.environment) {
    const env = shot.environment;
    if (env.location) parts.push(`in ${env.location}`);
    if (env.mood) parts.push(env.mood);
  }
  
  if (shot.lighting) {
    const light = shot.lighting;
    if (light.type) parts.push(`${light.type} lighting`);
    if (light.quality) parts.push(light.quality);
  }
  
  // Camera for photography
  if (shot.camera) {
    const cam = shot.camera;
    if (cam.lens) parts.push(`shot with ${cam.lens}`);
    if (cam.aperture) parts.push(cam.aperture);
  }
  
  // Art medium for illustrations/paintings
  if (shot.art_medium) {
    const art = shot.art_medium;
    if (art.tool_type) parts.push(art.tool_type);
    if (art.stroke_style) parts.push(art.stroke_style);
  }
  
  // Post-process
  if (settings.texture_overlay !== "none") {
    parts.push(settings.texture_overlay);
  }
  
  return parts.join(", ");
};

/**
 * Legacy: Build final prompt for V1 packs
 * Maps scene ID to shot prompt
 */
export const buildFinalPrompt = (pack: PackFile | LegacyPackFile, sceneId: string): string => {
  // Handle V2 pack
  if ("shots" in pack && pack.shots) {
    const shotId = parseInt(sceneId, 10);
    const shot = pack.shots.find(s => s.shot_id === shotId);
    if (!shot) throw new Error(`Shot with id "${sceneId}" not found`);
    
    // Build from shot data
    const parts: string[] = [];
    if (shot.environment?.details) parts.push(shot.environment.details);
    if (shot.composition?.angle) parts.push(shot.composition.angle);
    if (shot.pose?.expression) parts.push(shot.pose.expression);
    if (shot.wardrobe?.outfit) parts.push(`wearing ${shot.wardrobe.outfit}`);
    if (shot.lighting?.type) parts.push(`${shot.lighting.type} lighting`);
    return parts.join(", ") || shot.title;
  }
  
  // Handle V1 legacy pack
  if ("scenes" in pack && pack.scenes) {
    const scene = pack.scenes.find(s => s.id === sceneId || s.id === sceneId.padStart(2, "0"));
    if (!scene) throw new Error(`Scene with id "${sceneId}" not found`);
    
    const parts: string[] = [];
    if (pack.prompt_components?.identity) parts.push(pack.prompt_components.identity);
    parts.push(scene.prompt);
    if (pack.prompt_components?.style) parts.push(pack.prompt_components.style);
    if (pack.prompt_components?.negative) parts.push(pack.prompt_components.negative);
    
    return parts.join("\n\n");
  }
  
  throw new Error("Invalid pack format");
};

/**
 * Legacy: Get config for V1 packs
 */
export const getConfig = (pack: PackFile | LegacyPackFile): { temperature: number; top_p: number } => {
  // V2 pack - use default
  if ("global_render_settings" in pack) {
    return { temperature: 0.7, top_p: 0.95 };
  }
  
  // V1 legacy pack
  if ("config" in pack && pack.config) {
    return pack.config;
  }
  if ("generation" in pack && pack.generation) {
    return pack.generation;
  }
  
  return { temperature: 0.7, top_p: 0.95 };
};

/**
 * Get shot by ID
 */
export const getShot = (pack: PackFile, shotId: number): ShotItem | null => {
  return pack.shots.find(s => s.shot_id === shotId) || null;
};

/**
 * Normalize shot ID to consistent format
 */
export const normalizeShotId = (id: string | number): number => {
  if (typeof id === "number") return id;
  return parseInt(id, 10);
};

// ========== Legacy Support ==========
// For backwards compatibility with V1 packs

export interface LegacyPackMeta {
  pack_id: string;
  pack_name: string;
  title?: string;
  description: string;
  gender: "any" | "woman_only" | "man_only" | "genderless";
  category: string;
  tags: string[];
  cover_image?: string;
  preview_paths: string[];
}

export interface LegacyPackFile {
  meta: LegacyPackMeta;
  config?: { temperature: number; top_p: number };
  prompt_components?: { identity: string; style: string; negative: string };
  generation?: { temperature: number; top_p: number };
  style_anchor?: { prompt: string };
  scenes: Array<{ id: string; prompt: string; title?: string }>;
}

/**
 * Check if pack is in legacy format
 */
export const isLegacyPack = (pack: unknown): pack is LegacyPackFile => {
  return typeof pack === "object" && pack !== null && 
    "meta" in pack && 
    !("package_meta" in pack);
};

/**
 * Convert legacy pack format to new V2 format
 */
export const convertLegacyPack = (legacy: LegacyPackFile): PackFile => {
  const genderMap: Record<string, PackGender> = {
    "any": "mixed",
    "woman_only": "woman_only",
    "man_only": "man_only",
    "genderless": "genderless",
  };

  return {
    preview_images: legacy.meta.preview_paths || [],
    package_meta: {
      pack_id: legacy.meta.pack_id,
      package_name: legacy.meta.pack_name,
      gender: genderMap[legacy.meta.gender] || "mixed",
      description: legacy.meta.description,
      style_category: "Photography",
    },
    global_face_policy: {
      face_source: "uploaded_photo",
      face_reference_image: "uploaded_photo",
      keep_face_structure: true,
      allow_style_adaptation: true,
      allow_genderless_variation: true,
      distortion_protection_level: "maximum",
    },
    global_render_settings: {
      resolution: "4k",
      orientation: "portrait",
      aspect_ratio: "2:3",
      visual_style: legacy.prompt_components?.style || legacy.style_anchor?.prompt || "Cinematic Photo",
      color_profile: "Natural balanced colors",
      sharpness: "high",
      texture_overlay: "none",
      dynamic_range: "wide",
      rendering_engine: "85mm f/1.4",
      post_process: {
        exposure: "0",
        contrast: "medium",
        saturation: "natural",
        finish: "matte",
        line_quality: "none",
        lighting_style: "natural",
        extra_notes: legacy.prompt_components?.negative || "",
      },
    },
    shots: legacy.scenes.map((s, i) => ({
      shot_id: parseInt(s.id, 10) || i + 1,
      title: s.title || `Shot ${i + 1}`,
      environment: {
        details: s.prompt,
      },
    })),
  };
};
