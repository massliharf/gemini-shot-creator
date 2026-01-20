import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Supported aspect ratios for both models
const ASPECT_RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"];

// Model definitions
const MODELS = {
  flash: "gemini-2.5-flash-image",
  pro: "gemini-3-pro-image-preview",
} as const;

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
      // New multi-image support
      referenceImages,
      // Legacy fields for backward compatibility
      selfieBase64,
      selfieMimeType = "image/jpeg",
      selfie2Base64,
      selfie2MimeType = "image/jpeg",
      finalPrompt,
      model = "flash",
      aspectRatio = "4:5",
      resolution = "1K",
      generationGender,
    } = await req.json();

    // Validate API key
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, reason: "config_error", message: "GEMINI_API_KEY not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build image parts from referenceImages array or legacy fields
    const imageParts: unknown[] = [];
    
    if (referenceImages && Array.isArray(referenceImages) && referenceImages.length > 0) {
      // Use new multi-image format
      for (const img of referenceImages) {
        if (img.base64) {
          imageParts.push({ inline_data: { mime_type: img.mimeType || "image/jpeg", data: img.base64 } });
        }
      }
    } else {
      // Fall back to legacy fields
      if (selfieBase64) {
        imageParts.push({ inline_data: { mime_type: selfieMimeType, data: selfieBase64 } });
      }
      if (selfie2Base64) {
        imageParts.push({ inline_data: { mime_type: selfie2MimeType, data: selfie2Base64 } });
      }
    }

    // Validate required inputs
    if (imageParts.length === 0) {
      return new Response(
        JSON.stringify({ success: false, reason: "no_selfie", message: "At least one reference photo is required" }),
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

    // Resolve model name
    let resolvedModel: string;
    if (model === "flash" || model === "gemini-2.5-flash-image") {
      resolvedModel = MODELS.flash;
    } else if (model === "pro" || model === "gemini-3-pro-image-preview") {
      resolvedModel = MODELS.pro;
    } else {
      resolvedModel = MODELS.flash;
    }
    const isProModel = resolvedModel === MODELS.pro;

    // Validate aspect ratio
    const validAspectRatio = ASPECT_RATIOS.includes(aspectRatio) ? aspectRatio : "4:5";
    
    // Validate resolution for Pro model
    const validResolution = ["1K", "2K", "4K"].includes(resolution) ? resolution : "1K";

    console.log("=== GENERATION REQUEST ===");
    console.log("Model:", resolvedModel);
    console.log("Aspect Ratio:", validAspectRatio);
    console.log("Resolution:", isProModel ? validResolution : "N/A (Flash)");
    console.log("Reference Images Count:", imageParts.length);
    console.log("Generation Gender:", generationGender || "not specified");

    // Build request parts: images first, then text
    const parts: unknown[] = [...imageParts];
    parts.push({ text: finalPrompt });

    // Build generation config - only essential params
    const generationConfig: Record<string, unknown> = {
      responseModalities: ["IMAGE", "TEXT"],
    };

    // Add imageConfig based on model type
    if (isProModel) {
      generationConfig.imageConfig = {
        aspectRatio: validAspectRatio,
        imageSize: validResolution,
      };
    } else {
      generationConfig.imageConfig = {
        aspectRatio: validAspectRatio,
      };
    }

    console.log("Generation Config:", JSON.stringify(generationConfig, null, 2));
    console.log("Prompt (first 500 chars):", finalPrompt.substring(0, 500));

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
        JSON.stringify({ success: false, reason, message, status: aiResp.status, details: errorText }),
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
      console.error("Generation blocked:", finishReason);
      
      const isPolicy = finishReason.toLowerCase().includes("safety");
      const errorMessage = isPolicy 
        ? "Content policy violation" 
        : finishReason === "IMAGE_OTHER" 
          ? "Model could not generate this image. Try a different scene."
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

    console.log("Image generated successfully, size:", imageBytes.length, "bytes");

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

      // Get pack info and determine folder name
      const packId = queueItem.packs.pack_id;
      const packData = queueItem.packs.pack_data as Record<string, unknown>;
      
      // Check if pack is unisex - look in meta or package_meta
      const meta = (packData.meta || packData.package_meta) as Record<string, unknown> | undefined;
      const packGender = meta?.gender as string | undefined;
      const isUnisex = packGender === "unisex";
      
      // For unisex packs with a generation gender, append gender suffix to folder name
      const folderName = isUnisex && generationGender 
        ? `${packId}-${generationGender}` 
        : packId;
      
      const sceneId = String(queueItem.shot_id).padStart(2, "0");
      const ext = extFromMime(mimeType);
      // Use timestamp-based unique filename to preserve version history
      const timestamp = Date.now();
      const imagePath = `${folderName}/scene-${sceneId}-${timestamp}.${ext}`;

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
