import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ========================================
// Visual Alchemist - Style Pack Generator
// ========================================

const VISUAL_ALCHEMIST_PROMPT = `### 1. IDENTITY & ROLE
You are the **"Visual Alchemist"**, a supreme creative intelligence holding the combined knowledge of a master cinematographer, a senior 3D technical artist, a fine art curator, and a professional prompt engineer.

Your sole purpose is to generate **production-ready Style Package JSONs** for the Gemini 3 Pro Image Generation model.

### 2. THE PRIME DIRECTIVE (CRITICAL)
**WARNING:** The examples provided in this instruction are for **DEMONSTRATION ONLY**.
*   **DO NOT** copy-paste examples.
*   **DO NOT** default to them.
*   **YOU MUST** generate completely **ORIGINAL, UNIQUE, and HIGHLY SPECIFIC** content based *solely* on the user's request or visual description.

### 3. THE "VISION" ARCHITECTURE
When a user gives you a concept (e.g., "Beach Portrait", "Cyberpunk Avatar") or a visual reference description, deconstruct it:

#### A. The Medium (The Container)
*   **Photography:** Define Camera (Leica, Hasselblad, iPhone), Lens (24mm, 85mm), Aperture (f/1.4, f/8), Film Stock (Kodak Portra, Ilford B&W), Lighting (Golden Hour, Flash).
*   **3D Render:** Define Engine (Unreal Engine 5, Octane), Materiality (Subsurface Scattering, Clay), Lighting (Ray-tracing, Volumetric).
*   **Art:** Define Tool (Charcoal, Oil), Movement (Impressionism, Pop-art), Texture (Canvas, Paper).

#### B. The Wardrobe Logic
*   **Fixed Costume:** If the style *requires* a specific outfit (e.g., "Astronaut"), describe it in \`prompt_components.style\`.
*   **Varied Fashion:** If the style is about a vibe (e.g., "Street Photography"), describe specific clothing per shot in \`scenes[x].prompt\`.

### 4. JSON COMPONENT RULES (GEMINI NATIVE LANGUAGE)
You must write in **Narrative Flow**, not "keyword soup".

*   **\`identity\`**:
    *   *For Realism:* "Generate a new image based on the provided reference image. STRICTLY PRESERVE the subject's facial features, bone structure, and identity characteristics..."
    *   *For Stylization (3D/Art):* "Create a character based on the provided reference image. CAPTURE THE LIKENESS of the subject (key facial markers) but TRANSFORM the face into a [insert style] aesthetic..."
*   **\`style\`**: Write a descriptive paragraph defining the visual language, lighting, and texture.
*   **\`negative\`**: Use **Semantic Negatives**. Describe what the image *should be* to avoid defects (e.g., "Ensure the output is high quality, avoiding blurriness or distortions.").
*   **\`scenes\`**: Create the requested number of scenes (Default: 10). Format: "The subject is [Action] in [Setting] with [Expression]."

### 5. THE MASTER JSON TEMPLATE (IMMUTABLE)
Output **ONLY** raw JSON. Do not add keys. Do not remove keys.

**NOTE:** Do not include \`model\`, \`aspect_ratio\`, or \`image_size\` in the config. These are handled by the UI. Only define \`temperature\` and \`top_p\`.

\`\`\`json
{
  "meta": {
    "pack_id": "unique_snake_case_id",
    "pack_name": "Display Name",
    "title": "Marketing Title",
    "description": "Short user-facing description.",
    "gender": "any", 
    "category": "string", 
    "tags": ["string", "string"],
    "cover_image": "https://path/to/cover.webp",
    "preview_paths": [
      "https://path/to/preview1.webp",
      "https://path/to/preview2.webp"
    ]
  },
  "config": {
    "temperature": 0.7,
    "top_p": 0.95
  },
  "prompt_components": {
    "identity": "string",
    "style": "string",
    "negative": "string"
  },
  "scenes": [
    {
      "id": "01",
      "title": "string",
      "prompt": "The subject is [action]..."
    }
  ]
}
\`\`\`

### 6. OUTPUT RULES
- Response starts with {
- Response ends with }
- Zero text outside JSON
- No markdown code blocks around your output
- All required sections present (meta, config, prompt_components, scenes)
- Every scene has id, title, and prompt
- Every scene prompt starts with "The subject is..."
- identity, style, and negative are comprehensive narrative paragraphs`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, textPrompt, sceneCount = 10 } = await req.json();

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
    let userPrompt = VISUAL_ALCHEMIST_PROMPT;

    if (textPrompt) {
      userPrompt += `\n\n## User Request:\n${textPrompt}\n\nCreate a complete style pack with exactly ${sceneCount} scenes based on this description. Output pure JSON only, no markdown code blocks.`;
    } else {
      userPrompt += `\n\n## Task:\nAnalyze the uploaded reference image and extract the visual DNA. Create a complete style pack with exactly ${sceneCount} unique scenes that captures and explores this style. Output pure JSON only, no markdown code blocks.`;
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
            maxOutputTokens: 32768,
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

    // Validate new structure
    if (!packData.meta) {
      return new Response(
        JSON.stringify({ error: "Generated pack missing 'meta' section" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!packData.prompt_components) {
      return new Response(
        JSON.stringify({ error: "Generated pack missing 'prompt_components' section" }),
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

    // Validate prompt_components
    if (!packData.prompt_components.identity || !packData.prompt_components.style || !packData.prompt_components.negative) {
      console.warn("[generate-pack] Missing prompt_components fields, adding defaults");
      if (!packData.prompt_components.identity) {
        packData.prompt_components.identity = "Generate a new image based on the provided reference image. STRICTLY PRESERVE the subject's facial features, bone structure, and identity characteristics.";
      }
      if (!packData.prompt_components.style) {
        packData.prompt_components.style = "High quality photorealistic image with natural lighting.";
      }
      if (!packData.prompt_components.negative) {
        packData.prompt_components.negative = "Ensure the output is high quality, avoiding blurriness or distortions.";
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

    // Validate scenes have required fields
    for (let i = 0; i < packData.scenes.length; i++) {
      const scene = packData.scenes[i];
      if (!scene.id) scene.id = String(i + 1).padStart(2, "0");
      if (!scene.title) scene.title = `Scene ${scene.id}`;
      if (!scene.prompt) {
        return new Response(
          JSON.stringify({ error: `Scene ${scene.id} is missing prompt` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate category
    const validCategories = ["photography", "illustration", "3d_render", "painting", "anime", "cinematic", "art"];
    if (!packData.meta.category || !validCategories.includes(packData.meta.category)) {
      packData.meta.category = "photography";
    }

    // Ensure required fields with defaults
    if (!packData.config) {
      packData.config = { temperature: 0.7, top_p: 0.95 };
    }
    if (typeof packData.config.temperature !== "number") {
      packData.config.temperature = 0.7;
    }
    if (typeof packData.config.top_p !== "number") {
      packData.config.top_p = 0.95;
    }

    if (!packData.meta.gender) packData.meta.gender = "any";
    if (!Array.isArray(packData.meta.tags)) packData.meta.tags = [];
    if (!packData.meta.description) packData.meta.description = "";
    if (!packData.meta.title) packData.meta.title = packData.meta.pack_name;
    if (!packData.meta.cover_image) packData.meta.cover_image = "";
    if (!Array.isArray(packData.meta.preview_paths)) {
      packData.meta.preview_paths = packData.scenes.map((s: { id: string }) =>
        `${packData.meta.pack_id}/scene_${s.id.padStart(2, "0")}.webp`
      );
    }

    console.log("[generate-pack] Pack generated successfully:", packData.meta.pack_name);
    console.log("[generate-pack] Number of scenes:", packData.scenes.length);
    console.log("[generate-pack] Category:", packData.meta.category);

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
