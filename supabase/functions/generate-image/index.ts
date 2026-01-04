import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ========================================
// Style Pack Image Generator
// ========================================
// 
// This edge function generates images using the Gemini API
// based on style packs with the "Prompt Fusion" pattern:
//
// 1. User uploads photo (base64 encoded)
// 2. User selects a style pack and scene
// 3. Final prompt = global_style_anchor + scene.prompt
// 4. Request sent to Gemini with photo + prompt
// 5. Generated image returned and stored
//
// Supports both Gemini 2.5 Flash and Gemini 3 Pro models
// ========================================

// Supported aspect ratios
const ASPECT_RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"];

// Resolution mappings for Gemini 2.5 Flash Image (fixed per aspect ratio)
const FLASH_RESOLUTIONS: Record<string, string> = {
  "1:1": "1024x1024",
  "2:3": "832x1248",
  "3:2": "1248x832",
  "3:4": "864x1184",
  "4:3": "1184x864",
  "4:5": "896x1152",
  "5:4": "1152x896",
  "9:16": "768x1344",
  "16:9": "1344x768",
  "21:9": "1536x672",
};

// Resolution mappings for Gemini 3 Pro Image Preview (1K, 2K, 4K)
const PRO_RESOLUTIONS: Record<string, Record<string, string>> = {
  "1:1": { "1K": "1024x1024", "2K": "2048x2048", "4K": "4096x4096" },
  "2:3": { "1K": "848x1264", "2K": "1696x2528", "4K": "3392x5056" },
  "3:2": { "1K": "1264x848", "2K": "2528x1696", "4K": "5056x3392" },
  "3:4": { "1K": "896x1200", "2K": "1792x2400", "4K": "3584x4800" },
  "4:3": { "1K": "1200x896", "2K": "2400x1792", "4K": "4800x3584" },
  "4:5": { "1K": "928x1152", "2K": "1856x2304", "4K": "3712x4608" },
  "5:4": { "1K": "1152x928", "2K": "2304x1856", "4K": "4608x3712" },
  "9:16": { "1K": "768x1376", "2K": "1536x2752", "4K": "3072x5504" },
  "16:9": { "1K": "1376x768", "2K": "2752x1536", "4K": "5504x3072" },
  "21:9": { "1K": "1584x672", "2K": "3168x1344", "4K": "6336x2688" },
};

// Model endpoints
const MODELS = {
  flash: "gemini-2.5-flash-image",
  pro: "gemini-3-pro-image-preview",
} as const;

type ModelType = keyof typeof MODELS;

const base64ToBytes = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const extFromMime = (mimeType: string): string => {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      queueId,
      selfieBase64,
      selfieMimeType = "image/jpeg",
      selfie2Base64,
      selfie2MimeType = "image/jpeg",
      finalPrompt,
      model = "flash",
      temperature = 0.70,
      topP = 0.92,
      aspectRatio = "4:5",
      resolution = "1K",
    } = await req.json();

    console.log("Request received:", {
      queueId,
      model,
      temperature,
      topP,
      aspectRatio,
      resolution,
      hasPrompt: !!finalPrompt,
      hasSelfie: !!selfieBase64,
      hasSelfie2: !!selfie2Base64,
    });

    // Validate API key
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, reason: "config_error", message: "GEMINI_API_KEY not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate required inputs
    if (!selfieBase64) {
      return new Response(
        JSON.stringify({ success: false, reason: "no_selfie", message: "Reference photo is required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!finalPrompt) {
      return new Response(
        JSON.stringify({ success: false, reason: "no_prompt", message: "Prompt is required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Determine model and resolution
    // Accept both short keys ("flash", "pro") and full model names
    let resolvedModel: string;
    if (model === "flash" || model === "gemini-2.5-flash-image") {
      resolvedModel = MODELS.flash;
    } else if (model === "pro" || model === "gemini-3-pro-image-preview") {
      resolvedModel = MODELS.pro;
    } else {
      resolvedModel = MODELS.flash;
    }
    const isProModel = resolvedModel === MODELS.pro;

    const validAspectRatio = ASPECT_RATIOS.includes(aspectRatio) ? aspectRatio : "4:5";
    
    let imageSize: string;
    if (isProModel) {
      const validResolution = ["1K", "2K", "4K"].includes(resolution) ? resolution : "1K";
      imageSize = PRO_RESOLUTIONS[validAspectRatio]?.[validResolution] || PRO_RESOLUTIONS["4:5"]["1K"];
    } else {
      imageSize = FLASH_RESOLUTIONS[validAspectRatio] || FLASH_RESOLUTIONS["4:5"];
    }

    console.log("Generation config:", {
      model: resolvedModel,
      aspectRatio: validAspectRatio,
      imageSize,
      temperature,
      topP,
    });

    // Log the prompt for debugging
    console.log("Final prompt (first 500 chars):", finalPrompt.substring(0, 500));

    // Build prompt with output spec
    const promptWithSpec = `${finalPrompt}

Generate the image at ${validAspectRatio} aspect ratio.`;

    // Build request parts: images first, then text (per Gemini docs)
    const parts: unknown[] = [
      { inline_data: { mime_type: selfieMimeType, data: selfieBase64 } },
    ];

    if (selfie2Base64) {
      parts.push({ inline_data: { mime_type: selfie2MimeType, data: selfie2Base64 } });
    }

    parts.push({ text: promptWithSpec });

    // Build generation config (camelCase per Gemini API docs)
    const generationConfig: Record<string, unknown> = {
      temperature,
      topP,
      candidateCount: 1,
      maxOutputTokens: 8192,
    };

    // Pro model supports responseModalities and imageConfig
    if (isProModel) {
      generationConfig.responseModalities = ["TEXT", "IMAGE"];
      generationConfig.imageConfig = {
        aspectRatio: validAspectRatio,
        imageSize: resolution,
      };
    }

    // Call Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${GEMINI_API_KEY}`;

    const aiResp = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig,
      }),
    });

    if (!aiResp.ok) {
      const errorText = await aiResp.text();
      console.error("Gemini API error:", aiResp.status, errorText);

      const reason = aiResp.status === 429 ? "rate_limited" : aiResp.status === 402 ? "payment_required" : "api_error";
      const message = aiResp.status === 429 
        ? "Rate limits exceeded, please try again later." 
        : `Gemini API error: ${aiResp.status}`;

      return new Response(
        JSON.stringify({ success: false, reason, message, status: aiResp.status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResp.json();

    // Extract token usage
    const usage = aiData.usageMetadata || {};
    const tokenUsage = {
      promptTokens: usage.promptTokenCount || 0,
      candidatesTokens: usage.candidatesTokenCount || 0,
      totalTokens: usage.totalTokenCount || 0,
    };

    // Check finish reason
    const finishReason = aiData.candidates?.[0]?.finishReason;
    console.log("Finish reason:", finishReason);
    
    if (finishReason && !["STOP", "MAX_TOKENS"].includes(finishReason)) {
      console.error("Generation blocked:", finishReason, JSON.stringify(aiData.candidates?.[0]?.safetyRatings || []));
      
      const blockReason = aiData.candidates?.[0]?.blockReason;
      const safetyRatings = aiData.candidates?.[0]?.safetyRatings || [];
      
      console.error("Block details:", { blockReason, safetyRatings });
      
      const isPolicy = finishReason.toLowerCase().includes("safety") || blockReason;
      const errorMessage = isPolicy 
        ? "Content policy violation" 
        : finishReason === "IMAGE_OTHER" 
          ? "Model could not generate this image. Try a different scene or check your reference photo."
          : "Model could not generate this image";
      
      return new Response(
        JSON.stringify({
          success: false,
          reason: isPolicy ? "policy_block" : "generation_failed",
          message: errorMessage,
          finishReason,
          tokenUsage,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract image from response
    const responseParts = aiData.candidates?.[0]?.content?.parts || [];
    const imagePart = responseParts.find((p: Record<string, unknown>) => {
      const inline = p.inlineData || p.inline_data;
      const mt = (inline as Record<string, unknown>)?.mimeType || (inline as Record<string, unknown>)?.mime_type;
      return typeof mt === "string" && mt.startsWith("image/");
    });

    const inline = imagePart?.inlineData || imagePart?.inline_data;
    if (!inline?.data) {
      console.error("No image in response");
      return new Response(
        JSON.stringify({ success: false, reason: "no_image_data", message: "No image data in response", tokenUsage }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const imageBase64 = inline.data;
    const mimeType = inline.mimeType || inline.mime_type || "image/png";
    const imageBytes = base64ToBytes(imageBase64);

    // If queueId provided, upload to storage
    if (queueId) {
      const { data: queueItem, error: queueError } = await supabase
        .from("generation_queue")
        .select("*, packs!inner(*)")
        .eq("id", queueId)
        .single();

      if (queueError || !queueItem) {
        console.warn("Queue item not found, returning base64");
        return new Response(
          JSON.stringify({ success: true, imageBase64, mimeType, tokenUsage }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const packId = queueItem.packs.pack_id;
      const sceneId = String(queueItem.shot_id).padStart(2, "0");
      const ext = extFromMime(mimeType);
      const imagePath = `${packId}/scene-${sceneId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("generated-images")
        .upload(imagePath, imageBytes, { contentType: mimeType, upsert: true });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        await supabase
          .from("generation_queue")
          .update({ status: "error", error_message: `Upload failed: ${uploadError.message}` })
          .eq("id", queueId);

        return new Response(
          JSON.stringify({ success: false, reason: "upload_error", message: "Failed to upload image", tokenUsage }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase
        .from("generation_queue")
        .update({ status: "success", image_path: imagePath })
        .eq("id", queueId);

      const { data: { publicUrl } } = supabase.storage
        .from("generated-images")
        .getPublicUrl(imagePath);

      return new Response(
        JSON.stringify({ success: true, imageUrl: publicUrl, imagePath, tokenUsage }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return base64 if no queueId
    return new Response(
      JSON.stringify({ success: true, imageBase64, mimeType, tokenUsage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, reason: "server_error", message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
