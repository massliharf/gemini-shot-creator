// Pack Schema - Subject-Driven Image Generation (V2 - Detailed Format)

// ========== Package Meta ==========
export interface PackageMeta {
  pack_id: string;           // snake_case unique id
  package_name: string;      // Human readable display name
  gender: "any" | "female" | "male" | "genderless";
  description: string;       // 2-3 sentences
  style_category: string;    // e.g., "Photography Pack", "Illustration Pack"
}

// ========== Global Face Policy ==========
export interface GlobalFacePolicy {
  face_source: string;                    // "uploaded_photo"
  face_reference_image: string;           // "uploaded_photo"
  keep_face_structure: boolean;
  allow_style_adaptation: boolean;
  allow_genderless_variation: boolean;
  distortion_protection_level: "maximum" | "high" | "medium" | "low";
}

// ========== Global Render Settings ==========
export interface PostProcessSettings {
  exposure?: string;
  contrast?: string;
  saturation?: string;
  temperature?: string;
  tint?: string;
  skin_smoothing?: string;
  highlight_softening?: string;
  shadow_lift?: string;
  bloom_strength?: string;
  extra_notes?: string;
}

export interface GlobalRenderSettings {
  resolution: string;          // "4k", "1080p", etc.
  orientation: string;         // "portrait", "landscape", "square"
  aspect_ratio: string;        // "3:4", "16:9", etc.
  color_profile: string;
  sharpness: string;
  grain: string;
  dynamic_range: string;
  lens_profile: string;
  post_process?: PostProcessSettings;
}

// ========== Shot Details ==========
export interface ShotComposition {
  angle: string;
  framing: string;
  background: string;
  placement?: string;
}

export interface ShotLighting {
  type: string;
  direction?: string;
  quality?: string;
  shadow_behavior?: string;
  color?: string;
}

export interface ShotPose {
  head: string;
  eyes: string;
  expression: string;
  hair?: string;
  hands?: string;
}

export interface ShotRenderingStyle {
  texture?: string;
  finish?: string;
  style?: string;
  effects?: string;
  bloom?: string;
  colors?: string;
  mood?: string;
  atmosphere?: string;
  vibe?: string;
  skin?: string;
}

export interface ShotItem {
  shot_id: number;
  title: string;
  composition: ShotComposition;
  lighting: ShotLighting;
  pose: ShotPose;
  rendering_style?: ShotRenderingStyle;
}

// ========== Main Pack Structure (V2 - Detailed) ==========
export interface PackFileV2 {
  preview_images?: string[];
  package_meta: PackageMeta;
  global_face_policy: GlobalFacePolicy;
  global_render_settings: GlobalRenderSettings;
  shots: ShotItem[];
}

// ========== Legacy Pack Structure (V1 - Simple) ==========
export interface PackMeta {
  pack_id: string;
  pack_name: string;
  gender: "any" | "female" | "male";
  category: PackCategory;
  tags: string[];
  description: string;
  preview_paths: string[];
}

export interface GenerationConfig {
  temperature: number;
  top_p: number;
}

export interface StyleAnchor {
  prompt: string;
}

export interface SceneItem {
  id: string;
  prompt: string;
}

export interface PackFileV1 {
  meta: PackMeta;
  generation: GenerationConfig;
  style_anchor: StyleAnchor;
  scenes: SceneItem[];
}

// ========== Unified Pack Type ==========
export type PackFile = PackFileV1 | PackFileV2;
export type PackCategory = "photography" | "3d" | "illustration" | "painting";

// ========== Type Guards ==========
export const isV2Pack = (pack: PackFile): pack is PackFileV2 => {
  return 'package_meta' in pack && 'shots' in pack;
};

export const isV1Pack = (pack: PackFile): pack is PackFileV1 => {
  return 'meta' in pack && 'scenes' in pack;
};

// ========== Unified Accessors ==========
export const getPackId = (pack: PackFile): string => {
  if (isV2Pack(pack)) return pack.package_meta.pack_id;
  return pack.meta.pack_id;
};

export const getPackName = (pack: PackFile): string => {
  if (isV2Pack(pack)) return pack.package_meta.package_name;
  return pack.meta.pack_name;
};

export const getPackDescription = (pack: PackFile): string => {
  if (isV2Pack(pack)) return pack.package_meta.description;
  return pack.meta.description;
};

export const getPackGender = (pack: PackFile): string => {
  if (isV2Pack(pack)) return pack.package_meta.gender;
  return pack.meta.gender;
};

export const getPackCategory = (pack: PackFile): string => {
  if (isV2Pack(pack)) return pack.package_meta.style_category;
  return pack.meta.category;
};

export const getPackTags = (pack: PackFile): string[] => {
  if (isV1Pack(pack)) return pack.meta.tags || [];
  return [];
};

// ========== V2 Specific Accessors ==========
export const getFacePolicy = (pack: PackFile): GlobalFacePolicy | null => {
  if (isV2Pack(pack)) return pack.global_face_policy;
  return null;
};

export const getRenderSettings = (pack: PackFile): GlobalRenderSettings | null => {
  if (isV2Pack(pack)) return pack.global_render_settings;
  return null;
};

export const getShots = (pack: PackFile): ShotItem[] => {
  if (isV2Pack(pack)) return pack.shots;
  return [];
};

export const getShot = (pack: PackFile, shotId: number): ShotItem | null => {
  if (isV2Pack(pack)) {
    return pack.shots.find(s => s.shot_id === shotId) || null;
  }
  return null;
};

// ========== V1 Specific Accessors ==========
export const getStyleAnchor = (pack: PackFile): string => {
  if (isV1Pack(pack)) return pack.style_anchor?.prompt || "";
  return "";
};

export const getScenes = (pack: PackFile): SceneItem[] => {
  if (isV1Pack(pack)) return pack.scenes || [];
  return [];
};

// ========== Unified Scene/Shot Access ==========
// Get total count of scenes/shots
export const getSceneCount = (pack: PackFile): number => {
  if (isV2Pack(pack)) return pack.shots.length;
  if (isV1Pack(pack)) return pack.scenes?.length || 0;
  return 0;
};

// Check if pack has scenes/shots
export const hasScenes = (pack: PackFile): boolean => {
  if (isV2Pack(pack)) return pack.shots && pack.shots.length > 0;
  if (isV1Pack(pack)) return pack.scenes && pack.scenes.length > 0;
  return false;
};

// Get generation config (temperature, top_p)
export const getGenerationConfig = (pack: PackFile): GenerationConfig => {
  if (isV1Pack(pack) && pack.generation) {
    return pack.generation;
  }
  return { temperature: 1.0, top_p: 0.95 };
};

// ========== Scene/Shot Status (for UI) ==========
export type SceneStatus = 'idle' | 'generating' | 'success' | 'error';

export interface SceneWithStatus {
  id: string;
  prompt: string;
  title?: string;
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

export interface PackGenerationStats {
  packId: string;
  packName: string;
  totalTokensUsed: number;
  scenesGenerated: number;
  timestamp: string;
}

// ========== Legacy Aliases (backward compatibility) ==========
export type ShotStatus = SceneStatus;
export interface ShotWithStatus extends SceneWithStatus {
  shot_id?: number;
}

// ========== V2 Shot to Prompt Converter ==========
export const shotToPrompt = (shot: ShotItem, facePolicy: GlobalFacePolicy | null, renderSettings: GlobalRenderSettings | null): string => {
  const parts: string[] = [];

  // Title as scene context
  parts.push(`SCENE: "${shot.title}"`);

  // Composition
  const comp = shot.composition;
  parts.push(`COMPOSITION: ${comp.angle} angle, ${comp.framing} framing, background: ${comp.background}${comp.placement ? `, placement: ${comp.placement}` : ''}`);

  // Lighting
  const light = shot.lighting;
  let lightingStr = `LIGHTING: ${light.type}`;
  if (light.direction) lightingStr += `, direction: ${light.direction}`;
  if (light.quality) lightingStr += `, quality: ${light.quality}`;
  if (light.color) lightingStr += `, color: ${light.color}`;
  if (light.shadow_behavior) lightingStr += `, shadows: ${light.shadow_behavior}`;
  parts.push(lightingStr);

  // Pose
  const pose = shot.pose;
  let poseStr = `POSE: head ${pose.head}, eyes ${pose.eyes}, expression: ${pose.expression}`;
  if (pose.hair) poseStr += `, hair: ${pose.hair}`;
  if (pose.hands) poseStr += `, hands: ${pose.hands}`;
  parts.push(poseStr);

  // Rendering style
  if (shot.rendering_style) {
    const rs = shot.rendering_style;
    const rsItems: string[] = [];
    if (rs.texture) rsItems.push(`texture: ${rs.texture}`);
    if (rs.finish) rsItems.push(`finish: ${rs.finish}`);
    if (rs.style) rsItems.push(`style: ${rs.style}`);
    if (rs.effects) rsItems.push(`effects: ${rs.effects}`);
    if (rs.bloom) rsItems.push(`bloom: ${rs.bloom}`);
    if (rs.colors) rsItems.push(`colors: ${rs.colors}`);
    if (rs.mood) rsItems.push(`mood: ${rs.mood}`);
    if (rs.atmosphere) rsItems.push(`atmosphere: ${rs.atmosphere}`);
    if (rs.vibe) rsItems.push(`vibe: ${rs.vibe}`);
    if (rs.skin) rsItems.push(`skin: ${rs.skin}`);
    if (rsItems.length > 0) {
      parts.push(`RENDERING: ${rsItems.join(', ')}`);
    }
  }

  // Global render settings as style context
  if (renderSettings) {
    parts.push(`STYLE: ${renderSettings.color_profile}, ${renderSettings.lens_profile}`);
    if (renderSettings.post_process?.extra_notes) {
      parts.push(`POST-PROCESS: ${renderSettings.post_process.extra_notes}`);
    }
  }

  return parts.join('\n');
};
