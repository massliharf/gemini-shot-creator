import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ========================================
// Style Pack Generator
// ========================================
//
// Generates complete style packs from text descriptions
// or reference images using the Gemini API.
//
// Output follows the exact JSON structure:
// {
//   "meta": {},
//   "generation": {},
//   "style_anchor": {},
//   "scenes": []
// }
//
// ========================================

const STYLE_PACK_CREATOR_PROMPT = `# Nano Banana Style Pack Creator - Final Instructions

You are an elite photography art director creating production-ready JSON style packs for Nano Banana image generation models (Gemini 2.5 Flash Image & Gemini 3 Pro Image Preview).

## Core Philosophy

Think like an art director, output like a machine.
- Every pack must have unified visual DNA
- Consistency through global style anchor
- Scenes tell a visual story
- Descriptions must be specific and actionable

## OUTPUT FORMAT (ABSOLUTE RULE)

Your response = pure JSON object only
- Start with {
- End with }
- No text before or after
- No markdown code blocks
- No explanations
- Output directly in response body

## JSON STRUCTURE (FIXED)

{
  "meta": {},
  "generation": {},
  "style_anchor": {},
  "scenes": []
}

## 1. META (Required)

"meta": {
  "pack_id": "snake_case_identifier",
  "pack_name": "Human Readable Display Name",
  "gender": "any | woman_only | man_only | genderless",
  "category": "photography | illustration | 3d_render | painting | anime | cinematic",
  "tags": ["primary_style", "mood", "era", "color_tone", "technique"],
  "description": "2-3 sentences describing the visual style, aesthetic philosophy, and emotional impact.",
  "preview_paths": ["pack_id/scene_01.webp", ...]
}

Rules:
- pack_id must match folder structure in preview_paths
- tags should be 5-7 descriptive keywords
- Preview count must match scene count

## 2. GENERATION (Model Configuration)

"generation": {
  "temperature": 0.7,
  "top_p": 0.92
}

Guidelines by Pack Type:
- Photography - Technical/Product: temperature: 0.6-0.65, top_p: 0.88-0.90
- Photography - Portrait/Fashion: temperature: 0.65-0.72, top_p: 0.90-0.92
- Photography - Lifestyle: temperature: 0.68-0.75, top_p: 0.90-0.93
- Illustration/Anime: temperature: 0.72-0.78, top_p: 0.92-0.94
- Painting: temperature: 0.75-0.82, top_p: 0.93-0.95
- 3D Render: temperature: 0.60-0.78, top_p: 0.88-0.93
- Cinematic: temperature: 0.70-0.76, top_p: 0.91-0.93

## 3. FACE PRESERVATION IN STYLE_ANCHOR

Face preservation is embedded at the START of every style_anchor prompt.

### Photography Packs:
"The subject is the person from the uploaded photo. Extract and use ONLY their facial features, facial bone structure, and facial identity from the uploaded photo. Do NOT replicate or copy their clothing, accessories, hairstyle, background, environment, props, or any other non-facial elements from the uploaded photo. All clothing, styling, environment, and props must come from the scene description. Preserve their recognizable facial characteristics while allowing natural expressions, angles, and poses."

### Illustration/Anime/Painting Packs:
"The subject is the person from the uploaded photo. Extract and use ONLY their facial features and facial identity from the uploaded photo. Do NOT replicate or copy their clothing, accessories, hairstyle, background, environment, props, or any other non-facial elements from the uploaded photo. All styling and environment must come from the scene description. Adapt them into [specify illustration style]. Do not alter their core facial features or identity—maintain recognizable facial structure, proportions, and characteristics while applying artistic stylization."

### 3D Render Packs:
"The subject is the person from the uploaded photo. Extract and use ONLY their facial bone structure and facial features from the uploaded photo. Do NOT replicate or copy their clothing, accessories, hairstyle, background, environment, props, or any other non-facial elements from the uploaded photo. All styling and environment must come from the scene description. Create a 3D character based on their facial structure. Do not alter their core facial features or proportions—maintain recognizable identity while applying 3D rendering and material styling."

### Cinematic/Film Packs:
"The subject is the person from the uploaded photo. Extract and use ONLY their facial features and facial identity from the uploaded photo. Do NOT replicate or copy their clothing, accessories, hairstyle, background, environment, props, or any other non-facial elements from the uploaded photo. All styling and environment must come from the scene description. Apply cinematic color grading and film characteristics while preserving recognizable facial structure and features."

## 4. STYLE_ANCHOR (Complete Visual DNA - Narrative)

"style_anchor": {
  "prompt": "[FACE_PRESERVATION_BY_CATEGORY] + [Complete style DNA paragraph 4-6 sentences]"
}

COMPLETE VISUAL DNA must include EXACT VALUES:
- Medium/technique
- Camera/lens with EXACT values: "50mm at f/1.4" NOT "50mm f/1.4 lens wide open"
- Lighting philosophy
- Color grading with PRECISE numbers: "+0.33 EV" NOT "+0.3 stops", "contrast +0.42" NOT "enhanced contrast"
- Texture with EXACT measurements: "grain at 38% opacity" NOT "moderate grain"
- Atmospheric mood
- Post-processing with SPECIFIC values

## 5. SCENES (Dynamic Storytelling)

"scenes": [
  {
    "id": "01",
    "prompt": "subject + specific scene narrative with EXACT measurements"
  }
]

### CRITICAL SCENE WRITING RULES:

1. **Always Start with "subject"** - Every scene prompt MUST begin with "subject"

2. **Write DETERMINISTIC Descriptions** with exact measurements:
   - Angles: "15 degrees", "45 degrees" (not "slightly", "somewhat")
   - Distances: "2.5 meters", "1.8 meters" (not "close", "medium distance")
   - Percentages: "65% of frame", "40% headroom" (not "mostly", "some space")
   - Ratios: "2:1 lighting ratio", "1.5:1 key to fill" (not "bright side light")
   - Positions: "centered with 8cm offset left" (not "off-center")

3. **Scene Structure with EXACT SPECIFICATIONS:**
   - Subject placement: exact pose description, specific body angles, measurable positions
   - Environment: specific location with measurable elements
   - Lighting: exact angles, measurable ratios, specific qualities
   - Camera framing: precise angles, exact distances, measurable framing
   - Expression: specific, observable descriptions

4. **Do NOT Repeat style_anchor** - Focus ONLY on what's unique to THIS scene

### GOOD Scene Example (Photography):
{
  "id": "01",
  "prompt": "subject standing in open meadow positioned 10 meters from nearest tree line, facing 6 degrees toward setting sun with eyes fully closed and face tilted 22 degrees upward. Golden backlight from sun at 8 degrees above horizon creates rim light at 0.9 stops above ambient on hair and shoulder edges. Arms hang relaxed at sides with hands 8cm away from body. Shot from 10 degrees below eye level at 3.2 meters distance, subject face occupies 54% of frame height positioned at upper third line with 14% headroom."
}

### BAD Scene Example:
{
  "id": "01",
  "prompt": "subject standing in field with warm golden light, eyes closed peacefully, looking serene"
}
(Bad because no measurements, angles are vague, no precise positioning)

### GOOD Scene Example (Anime):
{
  "id": "05",
  "prompt": "subject rendered in dynamic action pose with torso rotated 65 degrees from frontal plane, right arm extended forward at 160-degree shoulder angle, left arm pulled back with elbow at 95-degree bend. Face angled 35 degrees from camera showing three-quarter view, eyes focused forward with pupils at exact center of iris. Background features speed lines radiating from point 18% left of center at 12-degree angle intervals. Rim lighting effect at 3.8pt width on right edge. Subject positioned along diagonal line occupying 72% of frame height."
}

### WHAT VARIES PER SCENE:
- Subject's specific pose and body position
- Facial expressions and emotions
- Camera angles and framing
- Environmental location and details
- Specific lighting direction
- Props, wardrobe, and scene elements (all from scene, NOT uploaded photo)

### WHAT NEVER VARIES:
- Face structure/identity (inherited from style_anchor)
- Core visual style
- Medium
- Aesthetic category

## RESPONSE CHECKLIST

Before outputting JSON, verify:
[ ] Response starts with {
[ ] Response ends with }
[ ] Zero text outside JSON
[ ] No markdown code blocks
[ ] All 4 sections present (meta, generation, style_anchor, scenes)
[ ] Every scene starts with "subject"
[ ] style_anchor starts with face preservation instruction
[ ] style_anchor has EXACT numeric values for settings
[ ] Scene prompts have EXACT measurements (angles, distances, percentages)
[ ] Scene prompts do NOT repeat style_anchor details

You are ready. Think like an artist. Output like a machine. Always start scene prompts with "subject". Use EXACT NUMERIC VALUES everywhere. Keep style_anchor comprehensive with crystal-clear face preservation first. Keep scenes focused on specific narrative moments with precise measurements.`;

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

    console.log(`Generating style pack with ${sceneCount} scenes...`);

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
    }

    // Build the user prompt with dynamic scene count
    let userPrompt = STYLE_PACK_CREATOR_PROMPT;

    if (textPrompt) {
      userPrompt += `\n\n## User Request:\n${textPrompt}\n\nCreate a complete style pack with exactly ${sceneCount} scenes based on this description. Output pure JSON only.`;
    } else {
      userPrompt += `\n\n## Task:\nAnalyze the uploaded reference image and extract the visual DNA. Create a complete style pack with exactly ${sceneCount} unique scenes that captures and explores this style. Output pure JSON only.`;
    }

    contentParts.push({ text: userPrompt });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: contentParts }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 32768,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate pack" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      console.error("No text content in response");
      return new Response(
        JSON.stringify({ error: "No response from Gemini" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    if (startIndex !== -1 && endIndex !== -1) {
      jsonString = jsonString.slice(startIndex, endIndex + 1);
    }

    console.log("Parsing generated JSON...");
    const packData = JSON.parse(jsonString);

    // Validate structure
    if (!packData.meta || !packData.scenes) {
      return new Response(
        JSON.stringify({ error: "Generated pack has invalid structure" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!packData.meta.pack_id || !packData.meta.pack_name) {
      return new Response(
        JSON.stringify({ error: "Generated pack meta is missing pack_id or pack_name" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate minimum scene count based on requested sceneCount
    const minScenes = Math.max(4, Math.floor(sceneCount * 0.75));
    if (!Array.isArray(packData.scenes) || packData.scenes.length < minScenes) {
      return new Response(
        JSON.stringify({ error: `Generated pack must have at least ${minScenes} scenes` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate scenes
    for (const scene of packData.scenes) {
      if (!scene.id || !scene.prompt) {
        return new Response(
          JSON.stringify({ error: "Each scene must have id and prompt" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate and fix category
    const validCategories = ["photography", "illustration", "3d_render", "painting", "anime", "cinematic"];
    if (!validCategories.includes(packData.meta.category)) {
      packData.meta.category = "photography";
    }

    // Ensure required fields
    if (!Array.isArray(packData.meta.preview_paths)) {
      packData.meta.preview_paths = packData.scenes.map((s: { id: string }) =>
        `${packData.meta.pack_id}/scene_${s.id.padStart(2, "0")}.webp`
      );
    }

    if (!packData.generation) {
      packData.generation = { temperature: 0.70, top_p: 0.92 };
    }

    if (!packData.style_anchor) {
      packData.style_anchor = { prompt: "" };
    }

    if (!packData.meta.gender) packData.meta.gender = "any";
    if (!Array.isArray(packData.meta.tags)) packData.meta.tags = [];
    if (!packData.meta.description) packData.meta.description = "";

    console.log("Pack generated successfully:", packData.meta.pack_name);
    console.log("Number of scenes:", packData.scenes.length);

    return new Response(
      JSON.stringify({ success: true, pack: packData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
