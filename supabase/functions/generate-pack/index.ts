import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ========================================
// Universal Visual Architect Prompt
// ========================================

const VISUAL_ARCHITECT_PROMPT = `# Role: Universal Visual Architect

**Identity:** You are an expert Visual Director. You construct style packs using the "Ultimate Technical Breakdown" logic (Geometry, Light, Material, Camera, Atmosphere).

**Objective:** Receive a short concept (e.g., "Christmas Studio") and expand it into a "Style Pack" JSON. This pack anchors a user's uploaded selfie (Reference Image) into 12 consistent, high-fidelity scenes.

## 1. The "Ultimate Breakdown" Protocol (Global Style)

You must generate the \`global_style_anchor\` by strictly integrating these 5 dimensions. Do not list them, weave them into a dense paragraph:

1. **GEOMETRY:** Lens choice (e.g., 85mm), Perspective, Distortion.
2. **LIGHT:** Physics of light (Softbox, Ray-tracing), Kelvin temperature, Falloff.
3. **MATERIAL:** Surface details (Skin pores, PBR textures, Fabric weave, Brushstroke impasto).
4. **CAMERA:** Sensor/Medium characteristics (Film grain, ISO noise, Glare, Bokeh).
5. **ATMOSPHERE:** Volumetrics (Fog, Haze, Air particles).

## 2. The "Subject Anchor" Protocol (Consistency)

The subject is **ALWAYS** the user's uploaded image.

* **Mandatory Phrase:** Every scene prompt MUST contain the phrase: **"featuring the subject from the provided reference image"**.
* **Prohibition:** NEVER describe physical features (hair, eyes, race) as the reference image provides these.
* **Focus:** Describe Wardrobe, Pose, Expression, and Action.

## 3. The "Smart Variety" Logic (No Silhouette Rule)

You have full creative freedom to generate 12 unique scenes, BUT you must obey these framing constraints:

* **FACE VISIBILITY:** The subject's face must ALWAYS be illuminated and clearly visible. **NO silhouettes**, **NO backlighting that hides the face**, **NO extreme long shots** where the face is unrecognizable.
* **DYNAMIC POSING:** Avoid repetitive standing poses. Generate a rich mix of sitting, leaning, walking, interacting with props, and expressive close-ups.
* **FRAMING MIX:** Autonomously ensure a balanced mix of Close-ups, Medium Shots (Waist-up), and Knee-up shots.

## 4. Output Format

Output **ONLY** strict, raw JSON using the template below. No markdown, no intro text.

{
  "meta": {
    "pack_id": "{{GENERATE: snake_case_style_name}}",
    "pack_name": "{{GENERATE: Title Case Display Name}}",
    "description": "{{GENERATE: A concise description of the visual mood.}}",
    "category": "{{SELECT ONE: Photography | 3D | Art | Illustration}}",
    "gender": "unisex",
    "featured": false,
    "tags": ["{{Tag 1}}", "{{Tag 2}}", "{{Tag 3}}", "{{Tag 4}}", "{{Tag 5}}"],
    "preview_paths": [
      "/{{pack_id}}/01.webp",
      "/{{pack_id}}/02.webp",
      "/{{pack_id}}/03.webp",
      "/{{pack_id}}/04.webp",
      "/{{pack_id}}/05.webp",
      "/{{pack_id}}/06.webp",
      "/{{pack_id}}/07.webp",
      "/{{pack_id}}/08.webp",
      "/{{pack_id}}/09.webp",
      "/{{pack_id}}/10.webp",
      "/{{pack_id}}/11.webp",
      "/{{pack_id}}/12.webp"
    ]
  },
  "global_style_anchor": "{{GENERATE: The MASTER PROMPT based on the 5-point Checklist (Geometry, Light, Material, Camera, Atmosphere). Define 'THE HOW'.}}",
  "scenes": [
    {"id": "01", "prompt": "{{GENERATE: Unique scene. Wardrobe, Pose, Setting. MUST include 'featuring the subject from the provided reference image'.}}"},
    {"id": "02", "prompt": "{{GENERATE: Different angle/pose/outfit. MUST include anchor phrase.}}"},
    {"id": "03", "prompt": "{{GENERATE: Different angle/pose/outfit. MUST include anchor phrase.}}"},
    {"id": "04", "prompt": "{{GENERATE: Different angle/pose/outfit. MUST include anchor phrase.}}"},
    {"id": "05", "prompt": "{{GENERATE: Different angle/pose/outfit. MUST include anchor phrase.}}"},
    {"id": "06", "prompt": "{{GENERATE: Different angle/pose/outfit. MUST include anchor phrase.}}"},
    {"id": "07", "prompt": "{{GENERATE: Different angle/pose/outfit. MUST include anchor phrase.}}"},
    {"id": "08", "prompt": "{{GENERATE: Different angle/pose/outfit. MUST include anchor phrase.}}"},
    {"id": "09", "prompt": "{{GENERATE: Different angle/pose/outfit. MUST include anchor phrase.}}"},
    {"id": "10", "prompt": "{{GENERATE: Different angle/pose/outfit. MUST include anchor phrase.}}"},
    {"id": "11", "prompt": "{{GENERATE: Different angle/pose/outfit. MUST include anchor phrase.}}"},
    {"id": "12", "prompt": "{{GENERATE: Different angle/pose/outfit. MUST include anchor phrase.}}"}
  ]
}

## CRITICAL RULES

1. **Output pure JSON only** - No markdown, no explanations, no code blocks
2. **Every prompt MUST include** "featuring the subject from the provided reference image"
3. **NEVER describe facial features** - the reference image dictates this
4. **12 scenes minimum** with Face/Look/Vibe architecture
5. **Be specific** - Expert-level detail for the chosen medium`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, textPrompt, sceneCount = 12 } = await req.json();

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

    console.log(`[generate-pack] Starting pack generation with ${sceneCount} scenes...`);
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
    let userPrompt = VISUAL_ARCHITECT_PROMPT;

    if (textPrompt) {
      userPrompt += `\n\n## User Request:\n${textPrompt}\n\nCreate a complete style pack with exactly ${sceneCount} scenes based on this description. Output pure JSON only.`;
    } else {
      userPrompt += `\n\n## Task:\nAnalyze the uploaded reference image and extract the visual DNA. Create a complete style pack with exactly ${sceneCount} unique scenes that captures and explores this style. Output pure JSON only.`;
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

    // Validate V3 structure: meta, global_style_anchor, scenes
    if (!packData.meta) {
      return new Response(
        JSON.stringify({ error: "Generated pack missing 'meta' section" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!packData.scenes || !Array.isArray(packData.scenes)) {
      return new Response(
        JSON.stringify({ error: "Generated pack missing 'scenes' array" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!packData.meta.pack_id || !packData.meta.pack_name) {
      return new Response(
        JSON.stringify({ error: "Generated pack meta is missing pack_id or pack_name" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!packData.global_style_anchor || typeof packData.global_style_anchor !== "string") {
      // Try to build from legacy format
      if (typeof packData.global_style_anchor === "object") {
        packData.global_style_anchor = Object.values(packData.global_style_anchor).filter(Boolean).join(", ");
      } else {
        packData.global_style_anchor = "";
      }
    }

    // Validate minimum scene count
    const minScenes = Math.max(4, Math.floor(sceneCount * 0.75));
    if (packData.scenes.length < minScenes) {
      return new Response(
        JSON.stringify({ error: `Generated pack must have at least ${minScenes} scenes, got ${packData.scenes.length}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate scenes have required fields (id, prompt)
    for (let i = 0; i < packData.scenes.length; i++) {
      const scene = packData.scenes[i];
      if (!scene.id) scene.id = String(i + 1).padStart(2, "0");
      if (!scene.prompt) scene.prompt = `Scene ${scene.id}`;
    }

    // Ensure meta fields with defaults
    if (!packData.meta.description) packData.meta.description = "";
    if (!packData.meta.category) packData.meta.category = "Photography";
    if (!packData.meta.gender) packData.meta.gender = "unisex";
    if (!packData.meta.tags) packData.meta.tags = [];
    if (!packData.meta.preview_paths) {
      packData.meta.preview_paths = packData.scenes.map((_: unknown, i: number) =>
        `/${packData.meta.pack_id}/${String(i + 1).padStart(2, "0")}.webp`
      );
    }

    console.log("[generate-pack] Pack generated successfully:", packData.meta.pack_name);
    console.log("[generate-pack] Number of scenes:", packData.scenes.length);
    console.log("[generate-pack] Category:", packData.meta.category);
    console.log("[generate-pack] Global style anchor length:", packData.global_style_anchor.length);

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
