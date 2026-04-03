import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STYLE_RULESET = `
Analyze this image with full technical detail for replication purposes. Cover lighting or light simulation, color palette (hex codes), composition, texture, grain or surface quality, mood, and a one-line style identity with an artist, photographer, film, or motion reference if applicable.

Then give me the output as described below.

## OUTPUT FORMAT
You MUST respond with ONLY a valid JSON object. No markdown, no explanation, no extra text.

The JSON must have this exact structure:
{
  "analysis": "Full technical analysis paragraph covering lighting, color palette (hex codes), composition, texture, grain, mood, and a one-line style identity with artist/photographer/film/motion reference if applicable",
  "style_name": "Short descriptive name for this style (2-4 words)",
  "prompts": [
    {
      "label": "Replication",
      "text": "A replication prompt that recreates this exact image"
    },
    {
      "label": "Template",
      "text": "A master template prompt with only the necessary placeholders for this specific style — could be [SUBJECT], [SCENE], [MOOD], [COLOR_ACCENT], [MATERIAL] or whatever actually makes sense for this style. Don't force placeholders that don't fit."
    },
    {
      "label": "Example 1",
      "text": "First filled example using the template — pick something that fits the style best (a character, an object, an environment, a concept)"
    },
    {
      "label": "Example 2",
      "text": "Second filled example using the template — different subject than Example 1"
    },
    {
      "label": "Example 3",
      "text": "Third filled example using the template — different subject than Examples 1 and 2"
    }
  ],
  "negative_prompt": "Properties to suppress during generation",
  "hex_codes": ["#HEXCODE1", "#HEXCODE2", "...precise hex codes for colors found in the image"]
}

If multiple distinct-style images are provided, create a "STYLE FUSION" set as well — add extra prompts with label prefix "Fusion: ".
If images share the same style, extract the strongest shared patterns into the prompts.

Be precise and technical. No vague adjectives.

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

    // Build content parts for Gemini API
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

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${GEMINI_API_KEY}`;

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
        JSON.stringify({ success: false, message: `AI error: ${aiResp.status} - ${errorText.substring(0, 200)}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResp.json();
    const responseText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch {
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
