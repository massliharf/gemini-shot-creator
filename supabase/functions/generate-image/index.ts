import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// All supported aspect ratios for both models
const ALL_ASPECT_RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"];

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

// Resolution mappings for Gemini 3 Pro Image Preview (1K, 2K, 4K per aspect ratio)
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

// Correct model names from Google AI Studio examples
const MODEL_TO_GEMINI: Record<string, string> = {
  // Official model IDs
  "gemini-2.5-flash-image": "gemini-2.5-flash-image",
  "gemini-3-pro-image-preview": "gemini-3-pro-image-preview",
};

const parseDataUrl = (dataUrl: string): { mimeType: string; base64: string } | null => {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
};

const base64ToBytes = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
};

const extFromMime = (mimeType: string) => {
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
      selfieMimeType,
      selfie2Base64,
      selfie2MimeType,
      fullPrompt,
      model = "gemini-2.5-flash-image",
      temperature = 1.0,
      topP = 0.95,
      aspectRatio = "1:1",
      resolution = "1K",
      negativePrompt,
    } = await req.json();

    console.log("Request received:", {
      queueId,
      model,
      temperature,
      topP,
      aspectRatio,
      resolution,
      hasPrompt: !!fullPrompt,
      selfieMimeType,
      selfie2MimeType,
    });

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, reason: "config_error", message: "GEMINI_API_KEY not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!selfieBase64) {
      return new Response(
        JSON.stringify({ success: false, reason: "no_selfie", message: "Selfie image is required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!fullPrompt) {
      return new Response(
        JSON.stringify({ success: false, reason: "no_prompt", message: "Prompt is required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isCoupleMode = !!selfieBase64 && !!selfie2Base64;
    const resolvedModel = MODEL_TO_GEMINI[model] || "gemini-2.5-flash-image";
    const isProModel = resolvedModel === "gemini-3-pro-image-preview";

    const validAspectRatio = ALL_ASPECT_RATIOS.includes(aspectRatio) ? aspectRatio : "1:1";

    let imageSize = "1024x1024";
    if (isProModel) {
      const validResolution = ["1K", "2K", "4K"].includes(resolution) ? resolution : "1K";
      imageSize = PRO_RESOLUTIONS[validAspectRatio]?.[validResolution] || PRO_RESOLUTIONS["1:1"]["1K"];
    } else {
      imageSize = FLASH_RESOLUTIONS[validAspectRatio] || FLASH_RESOLUTIONS["1:1"];
    }

    console.log("Computed size:", { validAspectRatio, resolution, imageSize, isProModel, modelRequested: model, modelResolved: resolvedModel });

    // Build final prompt (include negative prompt and explicit size spec)
    let finalPrompt = fullPrompt;
    if (negativePrompt) {
      finalPrompt = `${fullPrompt}\n\nNEGATIVE PROMPT: ${negativePrompt}`;
    }

    // The gateway image models don't expose a strict size param; we enforce via prompt + mapping.
    const promptWithSpec = `${finalPrompt}\n\nOUTPUT SPEC:\n- Aspect ratio: ${validAspectRatio}\n- Render size: ${imageSize} pixels (width×height).`;

    // IMPORTANT: mime types must match actual bytes (e.g. PNG data must not be sent as image/jpeg)
    const resolvedSelfieMimeType = typeof selfieMimeType === "string" && selfieMimeType.startsWith("image/")
      ? selfieMimeType
      : "image/jpeg";

    const resolvedSelfie2MimeType = typeof selfie2MimeType === "string" && selfie2MimeType.startsWith("image/")
      ? selfie2MimeType
      : "image/jpeg";

    // Build Gemini API request parts (images first, then text — matches AI Studio expectations)
    const parts: any[] = [
      { inline_data: { mime_type: resolvedSelfieMimeType, data: selfieBase64 } },
    ];

    if (isCoupleMode && selfie2Base64) {
      parts.push({ inline_data: { mime_type: resolvedSelfie2MimeType, data: selfie2Base64 } });
    }

    parts.push({ text: promptWithSpec });

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${GEMINI_API_KEY}`;

    // Build generationConfig based on model
    const generationConfig: Record<string, unknown> = {
      response_modalities: ["IMAGE", "TEXT"],
    };

    // Pro model supports image_config with image_size
    if (isProModel) {
      generationConfig.image_config = {
        image_size: resolution, // "1K", "2K", "4K"
      };
    }

    const aiResp = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig,
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("Gemini API error:", aiResp.status, t);

      const reason = aiResp.status === 429
        ? "rate_limited"
        : aiResp.status === 402
          ? "payment_required"
          : "api_error";

      const message = aiResp.status === 429
        ? "Rate limits exceeded, please try again later."
        : `Gemini API error: ${aiResp.status}`;

      return new Response(
        JSON.stringify({ success: false, reason, message, status: aiResp.status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData: any = await aiResp.json();

    const usage = aiData.usageMetadata || {};
    const tokenUsage = {
      promptTokens: usage.promptTokenCount || 0,
      candidatesTokens: usage.candidatesTokenCount || 0,
      totalTokens: usage.totalTokenCount || 0,
    };

    // Extract image from Gemini response format
    const candidates = aiData.candidates || [];
    const parts2 = candidates[0]?.content?.parts || [];

    const getInline = (p: any) => p?.inlineData ?? p?.inline_data;
    const imagePart = parts2.find((p: any) => {
      const inline = getInline(p);
      const mt = inline?.mimeType ?? inline?.mime_type;
      return typeof mt === "string" && mt.startsWith("image/");
    });

    const inline = imagePart ? getInline(imagePart) : null;

    if (!inline?.data) {
      console.error("No image in Gemini response", { candidates: JSON.stringify(candidates).slice(0, 500) });
      return new Response(
        JSON.stringify({ success: false, reason: "no_image_data", message: "No image data in response", tokenUsage }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const imageBase64 = inline.data;
    const mimeTypeFromResponse = (inline?.mimeType ?? inline?.mime_type ?? "image/png") as string;

    const imageBytes = base64ToBytes(imageBase64);
    const mimeType = mimeTypeFromResponse;

    // If queueId provided, update queue and upload to storage
    if (queueId) {
      const { data: queueItem, error: queueError } = await supabase
        .from("generation_queue")
        .select("*, packs!inner(*)")
        .eq("id", queueId)
        .single();

      if (queueError || !queueItem) {
        console.error("Queue item not found", { queueId, queueError });
        return new Response(
          JSON.stringify({
            success: true,
            imageBase64: imageBase64,
            mimeType,
            tokenUsage,
          }),
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

    return new Response(
      JSON.stringify({ success: true, imageBase64: imageBase64, mimeType, tokenUsage }),
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
