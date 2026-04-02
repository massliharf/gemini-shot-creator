import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STYLE_RULESET = `
# VISUAL STYLE ANALYSIS & PROMPT GENERATION RULESET

You are a visual style analysis engine. When a user uploads one or more reference images, you produce structured prompt templates that apply this style to any subject.

## ANALYSIS PROCESS
Analyze the reference image(s) layer by layer:
1. General Composition (format, framing, camera angle, DoF)
2. Lighting (source, direction, quality, shadows, color temperature, exposure)
3. Color Palette (dominant/accent colors with hex, harmony, saturation, grading)
4. Image Quality & Texture (resolution feel, grain, sharpness, lens characteristics)
5. Subject & Scene (subject, expression, clothing, background, props, depth layers)
6. Visual Style Identity Summary

## PROMPT ARCHITECTURE
Each prompt follows: [CORE STYLE BLOCK] + [SUBJECT] + [TECHNICAL BLOCK] + [MODIFIER BLOCK]

## HARD RULES
- State colors with hex values
- Anchor light to its source with technical specifics
- Describe DoF in photographic language
- Quantify grain and noise
- Use technical, specific language — avoid generic words like "beautiful" or "stunning"
- Most important properties come first in prompts

## OUTPUT FORMAT
You MUST respond with ONLY a valid JSON object. No markdown, no explanation, no extra text.

The JSON must have this exact structure:
{
  "analysis": "A single paragraph visual style identity summary",
  "style_name": "Short descriptive name for this style (2-4 words)",
  "prompts": [
    {
      "label": "Template",
      "text": "The placeholder template prompt with [SUBJECT], [SETTING] etc tags"
    },
    {
      "label": "Replication",
      "text": "Full prompt to reproduce the reference image exactly"
    },
    {
      "label": "Portrait Variation",
      "text": "Ready-to-use prompt: human/portrait in this style"
    },
    {
      "label": "Product Variation",
      "text": "Ready-to-use prompt: object/product/still life in this style"
    },
    {
      "label": "Landscape Variation",
      "text": "Ready-to-use prompt: location/landscape/architecture in this style"
    }
  ],
  "negative_prompt": "Properties to suppress during generation"
}

If multiple distinct-style images are provided, create a "STYLE FUSION" set as well — add extra prompts with label prefix "Fusion: ".
If images share the same style, extract the strongest shared patterns into the prompts.

RESPOND WITH ONLY THE JSON. NO OTHER TEXT.
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { referenceImages, projectId } = await req.json();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, message: "GEMINI_API_KEY not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!referenceImages?.length) {
      return new Response(
        JSON.stringify({ success: false, message: "At least one reference image is required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`=== ANALYZE STYLE === User: ${user.id}, Images: ${referenceImages.length}`);

    // Build content parts
    const contentParts: any[] = [];
    for (const ref of referenceImages) {
      if (ref.base64 && ref.mimeType) {
        contentParts.push({
          inlineData: { mimeType: ref.mimeType, data: ref.base64 },
        });
      }
    }

    contentParts.push({
      text: `Analyze the provided reference image(s) following the ruleset and return ONLY a valid JSON response.\n\n${STYLE_RULESET}`,
    });

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`;

    const aiResp = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: contentParts }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      }),
    });

    if (!aiResp.ok) {
      const errorText = await aiResp.text();
      console.error("Gemini error:", aiResp.status, errorText);
      return new Response(
        JSON.stringify({ success: false, message: `AI error: ${aiResp.status}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResp.json();
    const responseText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let parsed: any;
    try {
      // Try direct parse first
      parsed = JSON.parse(responseText);
    } catch {
      // Try extracting JSON from markdown code blocks
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1].trim());
      } else {
        console.error("Failed to parse AI response:", responseText.substring(0, 500));
        return new Response(
          JSON.stringify({ success: false, message: "Failed to parse AI response" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Update project with analysis
    if (projectId) {
      await supabase
        .from("style_projects")
        .update({
          analysis_text: parsed.analysis || "",
          name: parsed.style_name || "Untitled Style",
          status: "completed",
        })
        .eq("id", projectId)
        .eq("user_id", user.id);

      // Insert prompts
      if (Array.isArray(parsed.prompts)) {
        const promptRows = parsed.prompts.map((p: any, i: number) => ({
          project_id: projectId,
          user_id: user.id,
          prompt_text: p.text,
          prompt_label: p.label || `Prompt ${i + 1}`,
          sort_order: i,
        }));

        await supabase.from("style_prompts").insert(promptRows);
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: parsed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, message: error instanceof Error ? error.message : "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
