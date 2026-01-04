import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ========================================
// JSON Visual Asset Generator
// ========================================

const VISUAL_ASSET_GENERATOR_PROMPT = `JSON Visual Asset Generator

You are a professional Art Director that outputs production-ready JSON specifications for Photography, 3D Renders, Illustrations, and Digital Paintings.

OUTPUT FORMAT (ABSOLUTE RULE)

Your response = pure JSON object only.

Start with {

End with }

No text before or after

No markdown code blocks

No explanations

Output directly in response body, NOT in thinking blocks

STRUCTURE (FIXED)

Every pack has exactly 5 sections:

{
  "preview_images": [],
  "package_meta": {},
  "global_face_policy": {},
  "global_render_settings": {},
  "shots": []
}

1. preview_images (Required)

Array of preview image paths. Count must match shots.

"preview_images": [
  "/previews/pack-slug/shot-01.jpg",
  ...
]

2. package_meta (Required)

"package_meta": {
  "pack_id": "snake_case_id",
  "package_name": "Human Readable Name",
  "gender": "woman_only | man_only | genderless | mixed",
  "description": "3-5 detailed sentences about aesthetic, mood, color palette, medium (photo/3d/paint), and emotional tone",
  "style_category": "Photography | 3D Render | Digital Illustration | Oil Painting | Watercolor | Anime | Vector Art"
}

3. global_face_policy (FIXED - NEVER CHANGE)

"global_face_policy": {
  "face_source": "uploaded_photo",
  "face_reference_image": "uploaded_photo",
  "keep_face_structure": true,
  "allow_style_adaptation": true,
  "allow_genderless_variation": true,
  "distortion_protection_level": "maximum"
}

CRITICAL: These values NEVER change. Face identity preserved 100%.

4. global_render_settings (Theme-specific)

"global_render_settings": {
  "resolution": "4k | 8k",
  "orientation": "portrait | landscape | square",
  "aspect_ratio": "2:3 | 3:4 | 16:9 | 1:1",
  "visual_style": "Specific visual descriptor (e.g., 'Cinematic Photo', 'Unreal Engine 5 Render', 'Thick Impasto Oil', 'Flat Vector')",
  "color_profile": "Detailed color mood (e.g., 'Pastel macaron colors', 'Cyberpunk neon', 'Sepia vintage')",
  "sharpness": "low | medium | high",
  "texture_overlay": "none | film grain | canvas texture | watercolor paper | 3D noise",
  "dynamic_range": "narrow | balanced | wide",
  "rendering_engine": "Lens character OR Art Medium (e.g., '85mm f/1.2' OR 'Gouache on cold press paper' OR 'Octane Render with Subsurface Scattering')",
  "post_process": {
    "exposure": "Value or N/A",
    "contrast": "Value",
    "saturation": "Value",
    "finish": "matte | glossy | textured",
    "line_quality": "none | clean vector | sketch pencil | ink outline",
    "lighting_style": "natural | studio | volumetric | cel-shaded | rim-lit",
    "extra_notes": "Additional processing details for the specific medium"
  }
}

This creates 90%+ consistency across all shots.

5. shots (DYNAMIC - Think, don't template)

Each shot needs:

shot_id (number)

title (string)

Other fields = YOUR DECISION based on pack style

Available fields (use what matters for the medium):

For Photography:

camera: {lens, aperture, shutter_speed, iso}

lighting: {type, direction, quality, color}

For 3D Renders:

render_specs: {engine, material_type, reflection, subsurface_scattering}

lighting: {hdr_map, studio_setup, volumetric_fog}

geometry: {topology_style, poly_count_look}

For Illustration/Painting:

art_medium: {tool_type, stroke_style, paint_thickness, drying_effect}

line_work: {weight, style, roughness}

canvas: {background_texture, paper_type}

Common Fields:

composition: {angle, framing, placement, perspective}

pose: {body, hands, head, eyes, expression}

wardrobe: {outfit, style, colors, materials}

environment: {location, details, mood}

Decision framework:

Photography: Camera + Lighting + Realism

3D Render: Render Engine + Material Physics + Lighting

Painting: Brushwork + Canvas Texture + Color Blending

Illustration: Line Quality + Flat Color + Stylization

Anime: Cell Shading + Line Weight + Effect Layers

CONSISTENCY (90%+ target)

Same across pack:

Face identity (100%)

Color Palette

Artistic Medium (don't mix 3D with 2D)

Rendering/Brush Style

Can vary:

Angles, poses, expressions

Props, environment details

Micro lighting/shading adjustments

QUALITY STANDARDS

Descriptions must be specific to the medium:

❌ BAD: "A drawing of a girl."

✅ GOOD: "Charcoal sketch on textured beige paper, rough expressive strokes, heavy smudging shadows."

❌ BAD: "3D character."

✅ GOOD: "Stylized 3D character design, claymorphism material, soft bevel edges, subsurface scattering on skin, pastel lighting."

❌ BAD: "Oil painting."

✅ GOOD: "Classic Baroque oil painting technique, chiaroscuro lighting, visible thick brushstrokes, cracked varnish finish."

RULES

User can request in any language → output English JSON

Never ask questions → make smart decisions

No placeholders

Production-ready output

CRITICAL REMINDER

Before responding:

Does response start with {?

Does response end with }?

Is there ANY text outside JSON? → DELETE IT

Are there code blocks? → REMOVE THEM

Output JSON only.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, textPrompt, shotCount = 12 } = await req.json();

    if (!imageBase64 && !textPrompt) {
      return new Response(
        JSON.stringify({ error: "Image or text prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[generate-pack] Starting pack generation with ${shotCount} shots...`);
    console.log(`[generate-pack] Input: imageBase64=${!!imageBase64}, textPrompt=${!!textPrompt}`);

    // Build content parts
    const contentParts: unknown[] = [];

    // Add image if provided (Reference Image Mode)
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      contentParts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: cleanBase64,
        },
      });
      console.log("[generate-pack] Added reference image to content");
    }

    // Build the user prompt
    let userPrompt = VISUAL_ASSET_GENERATOR_PROMPT;

    if (textPrompt) {
      userPrompt += `\n\n## User Request:\n${textPrompt}\n\nCreate a complete visual asset pack with exactly ${shotCount} shots based on this description. Output pure JSON only.`;
    } else {
      userPrompt += `\n\n## Task:\nAnalyze the uploaded reference image and extract the visual DNA. Create a complete visual asset pack with exactly ${shotCount} unique shots that captures and explores this style. Output pure JSON only.`;
    }

    contentParts.push({ text: userPrompt });

    console.log("[generate-pack] Calling Gemini API...");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: contentParts }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 65536,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[generate-pack] Gemini API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Gemini API error: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("[generate-pack] Gemini API response received");

    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      console.error("[generate-pack] No text content in response:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "No response from Gemini" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[generate-pack] Raw response length:", textContent.length);
    console.log("[generate-pack] Raw response (first 500 chars):", textContent.substring(0, 500));

    // Extract JSON from response
    let jsonString = textContent.trim();

    // Remove markdown code blocks if present
    if (jsonString.startsWith("```json")) {
      jsonString = jsonString.slice(7);
    } else if (jsonString.startsWith("```")) {
      jsonString = jsonString.slice(3);
    }
    if (jsonString.endsWith("```")) {
      jsonString = jsonString.slice(0, -3);
    }
    jsonString = jsonString.trim();

    // Find JSON boundaries
    const startIndex = jsonString.indexOf("{");
    const endIndex = jsonString.lastIndexOf("}");

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      jsonString = jsonString.slice(startIndex, endIndex + 1);
    }

    console.log("[generate-pack] Parsing JSON...");
    
    let packData;
    try {
      packData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("[generate-pack] JSON parse error:", parseError);
      console.error("[generate-pack] Failed JSON string (first 1000 chars):", jsonString.substring(0, 1000));
      return new Response(
        JSON.stringify({ error: "Failed to parse generated JSON" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate new V2 structure
    if (!packData.package_meta) {
      return new Response(
        JSON.stringify({ error: "Generated pack missing 'package_meta' section" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!packData.shots || !Array.isArray(packData.shots)) {
      return new Response(
        JSON.stringify({ error: "Generated pack missing 'shots' array" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!packData.package_meta.pack_id || !packData.package_meta.package_name) {
      return new Response(
        JSON.stringify({ error: "Generated pack package_meta is missing pack_id or package_name" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ensure global_face_policy is fixed
    packData.global_face_policy = {
      face_source: "uploaded_photo",
      face_reference_image: "uploaded_photo",
      keep_face_structure: true,
      allow_style_adaptation: true,
      allow_genderless_variation: true,
      distortion_protection_level: "maximum",
    };

    // Validate global_render_settings
    if (!packData.global_render_settings) {
      packData.global_render_settings = {
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
    }

    // Ensure post_process exists
    if (!packData.global_render_settings.post_process) {
      packData.global_render_settings.post_process = {
        exposure: "0",
        contrast: "medium",
        saturation: "natural",
        finish: "matte",
        line_quality: "none",
        lighting_style: "natural",
        extra_notes: "",
      };
    }

    // Validate minimum shot count
    const minShots = Math.max(4, Math.floor(shotCount * 0.75));
    if (packData.shots.length < minShots) {
      return new Response(
        JSON.stringify({ error: `Generated pack must have at least ${minShots} shots, got ${packData.shots.length}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate shots have required fields
    for (let i = 0; i < packData.shots.length; i++) {
      const shot = packData.shots[i];
      if (shot.shot_id === undefined) shot.shot_id = i + 1;
      if (!shot.title) shot.title = `Shot ${shot.shot_id}`;
    }

    // Generate preview_images if missing
    if (!Array.isArray(packData.preview_images) || packData.preview_images.length === 0) {
      packData.preview_images = packData.shots.map((s: { shot_id: number }) =>
        `/previews/${packData.package_meta.pack_id}/shot-${String(s.shot_id).padStart(2, "0")}.jpg`
      );
    }

    // Validate gender
    const validGenders = ["woman_only", "man_only", "genderless", "mixed"];
    if (!packData.package_meta.gender || !validGenders.includes(packData.package_meta.gender)) {
      packData.package_meta.gender = "mixed";
    }

    // Ensure required fields with defaults
    if (!packData.package_meta.description) {
      packData.package_meta.description = "";
    }
    if (!packData.package_meta.style_category) {
      packData.package_meta.style_category = "Photography";
    }

    console.log("[generate-pack] Pack generated successfully:", packData.package_meta.package_name);
    console.log("[generate-pack] Number of shots:", packData.shots.length);
    console.log("[generate-pack] Style category:", packData.package_meta.style_category);

    return new Response(
      JSON.stringify({ success: true, pack: packData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[generate-pack] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
