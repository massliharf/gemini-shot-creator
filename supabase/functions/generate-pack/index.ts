import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STYLE_PACK_GENERATOR_PROMPT = `# JSON Style Pack Generator Agent — System Instructions

## ROLE & IDENTITY

You are a **Visual World Architect** and **Creative Director**.

You do not generate images.  
You design **coherent visual systems** that images can be generated from independently.

You think like a director, an art director, and a system designer at the same time.  
You define **visual laws**, not single outputs.

---

## CORE MISSION

Your task is to generate **JSON image style packs** for subject-driven image generation.

Each pack must:
- Produce stylistically consistent results
- Work even when scenes are generated individually
- Always preserve clear facial visibility
- Be suitable for large-scale automation

---

## FIXED JSON STRUCTURE (ABSOLUTE)

You MUST output JSON using **exactly** this structure:

{
  "meta": {},
  "generation": {},
  "style_anchor": {},
  "scenes": []
}

- Never add or remove root keys  
- Never change key names  
- Only replace placeholder values with meaningful content  

---

## META RULES

- pack_id: snake_case
- pack_name: human readable
- gender: any | female | male
- category: photography | 3d | illustration | painting
- tags: descriptive keywords (4-6 tags)
- description: 2–3 sentences describing the visual style
- preview_paths: Array using format "<pack_id>/scene_01.webp"

pack_id and pack_name must match semantically.

---

## GENERATION CONFIG (PACK LEVEL ONLY)

Fields:
- temperature (0.65–0.85)
- top_p (0.90–0.95)

Defaults by category:
- Photography: 0.72 / 0.92
- Illustration/Painting: 0.80 / 0.94
- 3D: 0.68 / 0.90

All scenes inherit the same values.

---

## STYLE ANCHOR (VISUAL DNA)

Must define:
- Medium
- Lighting philosophy
- Color behavior
- Texture/material feel
- Emotional tone

Must NOT include:
- Scenes
- Poses
- Locations
- Clothing
- Camera brands

Abstract, global, reusable.

---

## SCENES

Each scene:
{ "id": "01", "prompt": "" }

Rules:
- Works independently
- Face clearly visible
- Front or 3/4 view
- Identity preserved
- Generate exactly 12 scenes

Forbidden:
- Silhouettes
- Back-facing
- Obscured faces

---

## SUBJECT HANDLING
- Subject comes from image input
- Never mention selfie or reference image
- Never alter facial structure

---

## FINAL CHECKLIST
- JSON structure exact (meta, generation, style_anchor, scenes)
- Generation config present with temperature and top_p
- Style anchor abstract and focused on visual DNA
- No hidden faces in any scene
- Scenes independent and self-contained
- Exactly 12 scenes

You define visual laws. Every image must belong to the same world.

## IMPORTANT: OUTPUT FORMAT

Return ONLY valid JSON, no markdown code blocks, no explanation text before or after.
The response must start with { and end with }`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, textPrompt } = await req.json();

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

    console.log("Generating pack with Style Pack Generator prompt...");

    // Build content parts based on input type
    const contentParts: unknown[] = [];

    // Add image if provided (Reference Image Mode)
    if (imageBase64) {
      contentParts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: imageBase64.replace(/^data:image\/\w+;base64,/, ""),
        },
      });
    }

    // Build the prompt
    let userPrompt = STYLE_PACK_GENERATOR_PROMPT;
    
    if (textPrompt) {
      // Text Description Mode
      userPrompt += `\n\n## User Request:\n${textPrompt}\n\nCreate a complete style pack based on this description.`;
    } else {
      // Reference Image Mode
      userPrompt += `\n\n## Task:\nAnalyze the uploaded reference image(s) and extract the visual DNA. Create a complete style pack that captures and explores this style across 12 unique scenes.`;
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
      console.error("No text content in response:", data);
      return new Response(
        JSON.stringify({ error: "No response from Gemini" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract JSON from response (handle potential markdown wrapping)
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

    // Find the JSON object boundaries
    const startIndex = jsonString.indexOf('{');
    const endIndex = jsonString.lastIndexOf('}');
    
    if (startIndex !== -1 && endIndex !== -1) {
      jsonString = jsonString.slice(startIndex, endIndex + 1);
    }

    console.log("Parsing generated JSON...");
    const packData = JSON.parse(jsonString);
    
    // Validate the new nested schema structure
    if (!packData.meta || !packData.scenes) {
      console.error("Invalid pack structure:", packData);
      return new Response(
        JSON.stringify({ error: "Generated pack has invalid structure (missing meta or scenes)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate meta fields
    if (!packData.meta.pack_id || !packData.meta.pack_name) {
      console.error("Invalid meta structure:", packData.meta);
      return new Response(
        JSON.stringify({ error: "Generated pack meta is missing pack_id or pack_name" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate scenes is an array with at least 8 scenes
    if (!Array.isArray(packData.scenes) || packData.scenes.length < 8) {
      console.error("Invalid scenes count:", packData.scenes?.length);
      return new Response(
        JSON.stringify({ error: "Generated pack must have at least 8 scenes" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate each scene has id and prompt
    for (const scene of packData.scenes) {
      if (!scene.id || !scene.prompt) {
        console.error("Invalid scene structure:", scene);
        return new Response(
          JSON.stringify({ error: "Each scene must have id and prompt" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate category
    const validCategories = ["photography", "3d", "illustration", "painting"];
    if (!validCategories.includes(packData.meta.category)) {
      console.warn("Invalid category, defaulting to photography:", packData.meta.category);
      packData.meta.category = "photography";
    }

    // Ensure preview_paths is an array
    if (!Array.isArray(packData.meta.preview_paths)) {
      packData.meta.preview_paths = packData.scenes.map((s: { id: string }) => 
        `${packData.meta.pack_id}/scene_${s.id.padStart(2, '0')}.webp`
      );
    }

    // Ensure generation config exists
    if (!packData.generation) {
      packData.generation = { temperature: 0.72, top_p: 0.92 };
    }

    // Ensure style_anchor exists
    if (!packData.style_anchor) {
      packData.style_anchor = { prompt: "" };
    }

    // Ensure other required meta fields
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
