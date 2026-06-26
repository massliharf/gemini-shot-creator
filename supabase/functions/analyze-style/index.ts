import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { logGeminiUsage } from "../_shared/gemini-usage.ts";

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

const MAX_OUTPUT_TOKENS = 8192;

const extractResponseText = (aiData: any) => {
  const parts = aiData?.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim();
};

const extractJsonPayload = (responseText: string) => {
  if (!responseText) return "";

  const fencedMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) return fencedMatch[1].trim();

  const firstBrace = responseText.indexOf("{");
  const lastBrace = responseText.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return responseText.slice(firstBrace, lastBrace + 1).trim();
  }

  return responseText.trim();
};

const normalizeAnalysisPayload = (payload: any) => {
  const promptsSource = Array.isArray(payload?.prompts)
    ? payload.prompts
    : Array.isArray(payload?.variants)
      ? payload.variants
      : [];

  const prompts = promptsSource
    .map((prompt: any, index: number) => ({
      label:
        typeof prompt?.label === "string" && prompt.label.trim()
          ? prompt.label.trim()
          : `Prompt ${index + 1}`,
      text:
        typeof prompt?.text === "string"
          ? prompt.text.trim()
          : typeof prompt?.prompt === "string"
            ? prompt.prompt.trim()
            : "",
    }))
    .filter((prompt: { text: string }) => prompt.text.length > 0);

  const hexCodes = Array.isArray(payload?.hex_codes)
    ? payload.hex_codes
        .filter((code: unknown) => typeof code === "string")
        .map((code: string) => (code.startsWith("#") ? code.toUpperCase() : `#${code.toUpperCase()}`))
        .filter((code: string) => /^#[0-9A-F]{6}$/.test(code))
    : [];

  return {
    analysis: typeof payload?.analysis === "string" ? payload.analysis.trim() : "",
    styleName: typeof payload?.style_name === "string" ? payload.style_name.trim() : "",
    negativePrompt:
      typeof payload?.negative_prompt === "string" ? payload.negative_prompt.trim() : "",
    hexCodes,
    prompts,
  };
};

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

    const failProject = async (message: string) => {
      if (projectId) {
        await supabase
          .from("style_projects")
          .update({
            status: "failed",
            name: "Analysis Failed",
            analysis_text: message,
          })
          .eq("id", projectId);
      }
    };

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
          maxOutputTokens: MAX_OUTPUT_TOKENS,
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
    const finishReason = aiData?.candidates?.[0]?.finishReason || "UNKNOWN";
    const responseText = extractResponseText(aiData);

    console.log("Analyze finishReason:", finishReason);
    console.log("Analyze usageMetadata:", JSON.stringify(aiData?.usageMetadata || {}));

    // Log token usage to gemini_usage_logs
    await logGeminiUsage({
      userId: user.id,
      functionName: "analyze-style",
      model: "gemini-3.1-pro-preview",
      usageMetadata: aiData?.usageMetadata,
      imageCount: 0,
      status: responseText ? "success" : "no_response",
      metadata: { referenceImageCount: referenceImages.length, finishReason },
    });

    if (!responseText) {
      const message = finishReason === "MAX_TOKENS"
        ? "Analysis output was truncated. Try fewer or smaller reference images."
        : "AI returned an empty analysis response.";
      await failProject(message);
      return new Response(
        JSON.stringify({ success: false, message, finishReason }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jsonPayload = extractJsonPayload(responseText);

    let parsed: any;
    try {
      parsed = JSON.parse(jsonPayload);
    } catch {
      console.error("Failed to parse AI response:", responseText.substring(0, 500));
      const message = finishReason === "MAX_TOKENS"
        ? "Analysis output was truncated before the JSON completed. Try fewer or smaller reference images."
        : "Failed to parse AI response";
      await failProject(message);
      return new Response(
        JSON.stringify({ success: false, message, finishReason }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalized = normalizeAnalysisPayload(parsed);
    const hasValidAnalysis = normalized.analysis.length > 0;
    const hasValidStyleName = normalized.styleName.length > 0;
    const hasValidPrompts = normalized.prompts.length > 0;

    if (!hasValidAnalysis || !hasValidStyleName || !hasValidPrompts) {
      const message = finishReason === "MAX_TOKENS"
        ? "Analysis was incomplete. Try fewer or smaller reference images."
        : "AI returned incomplete analysis data.";
      console.error("Incomplete analysis payload:", JSON.stringify(parsed).substring(0, 500));
      await failProject(message);
      return new Response(
        JSON.stringify({
          success: false,
          message,
          finishReason,
          details: {
            hasValidAnalysis,
            hasValidStyleName,
            hasValidPrompts,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update project with analysis
    if (projectId) {
      const { error: projectUpdateError } = await supabase
        .from("style_projects")
        .update({
          analysis_text: normalized.analysis,
          name: normalized.styleName,
          status: "completed",
        })
        .eq("id", projectId)
        .eq("user_id", user.id);

      if (projectUpdateError) {
        console.error("Failed to update style project:", projectUpdateError);
        return new Response(
          JSON.stringify({ success: false, message: "Failed to save analyzed project" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: deletePromptError } = await supabase
        .from("style_prompts")
        .delete()
        .eq("project_id", projectId)
        .eq("user_id", user.id);

      if (deletePromptError) {
        console.error("Failed to clear old prompts:", deletePromptError);
      }

      const promptRows = normalized.prompts.map((p: any, i: number) => ({
        project_id: projectId,
        user_id: user.id,
        prompt_text: p.text,
        prompt_label: p.label || `Prompt ${i + 1}`,
        sort_order: i,
      }));

      const { error: promptInsertError } = await supabase.from("style_prompts").insert(promptRows);
      if (promptInsertError) {
        console.error("Failed to save prompts:", promptInsertError);
        await failProject("Analysis completed but prompts could not be saved.");
        return new Response(
          JSON.stringify({ success: false, message: "Failed to save generated prompts" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          analysis: normalized.analysis,
          style_name: normalized.styleName,
          prompts: normalized.prompts,
          negative_prompt: normalized.negativePrompt,
          hex_codes: normalized.hexCodes,
        },
      }),
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
