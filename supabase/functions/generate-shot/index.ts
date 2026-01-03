import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { queueId } = await req.json();

    if (!queueId) {
      return new Response(
        JSON.stringify({ success: false, reason: "missing_queue_id", message: "Queue ID is required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get queue item with pack
    const { data: queueItem, error: queueError } = await supabase
      .from("generation_queue")
      .select("*, packs!inner(*)")
      .eq("id", queueId)
      .single();

    if (queueError || !queueItem) {
      console.error("Queue item not found", { queueId, queueError });
      return new Response(
        JSON.stringify({ success: false, reason: "queue_not_found", message: "Queue item not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update status to generating
    await supabase
      .from("generation_queue")
      .update({ status: "generating" })
      .eq("id", queueId);

    const packData = queueItem.packs.pack_data;
    const scene = queueItem.shot_data;

    // Extract settings - model and image size (correct model names from Google AI Studio)
    const selectedModel = scene.selectedModel || "gemini-2.5-flash-image";
    const validModels = ["gemini-2.5-flash-image", "gemini-3-pro-image-preview"];
    const model = validModels.includes(selectedModel) ? selectedModel : "gemini-2.5-flash-image";
    
    const aspectRatio = scene.aspectRatio || "1:1";
    const imageSize = scene.imageSize || "1K"; // 1K, 2K, 4K

    console.log("Model:", model, "Aspect:", aspectRatio, "Size:", imageSize);

    // ========== BUILD PROMPT ==========
    const config = packData.config || {};
    const sceneId = scene.id || scene.scene_id || "1";
    
    // Get scene prompt from scenes object
    const scenesMap = packData.scenes || {};
    const scenePrompt = scene.prompt || scenesMap[sceneId] || "";

    // Build prompt using new format: base_prompt + scene prompt
    function buildPrompt(
      pack: Record<string, unknown>, 
      scenePromptText: string, 
      isCoupleMode: boolean
    ): string {
      const basePrompt = (pack.base_prompt as string) || "";
      const apiRef = isCoupleMode 
        ? "the people in these images" 
        : "the person in this image";

      // Replace [SUBJECT] with API reference
      const processedBase = basePrompt.replace(/\[SUBJECT\]/g, apiRef);
      const processedScene = scenePromptText.replace(/\[SUBJECT\]/g, apiRef);

      // Combine: base_prompt + scene prompt
      const finalPrompt = `${processedBase} ${processedScene}`;
      return finalPrompt.split(/\s+/).join(' ').trim();
    }

    console.log("Scene data:", JSON.stringify(scene));
    console.log("Config:", JSON.stringify(config));

    // ========== GET REFERENCE IMAGES (memory-efficient) ==========
    function arrayBufferToBase64(buffer: ArrayBuffer): string {
      const bytes = new Uint8Array(buffer);
      const chunkSize = 8192;
      let result = "";
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        result += String.fromCharCode.apply(null, Array.from(chunk));
      }
      return btoa(result);
    }

    async function getImageBase64(path: string): Promise<{ base64: string; mimeType: string } | null> {
      try {
        const { data } = await supabase.storage
          .from("generated-images")
          .download(path);

        if (!data) return null;

        const buffer = await data.arrayBuffer();
        const base64 = arrayBufferToBase64(buffer);
        return { base64, mimeType: data.type || "image/jpeg" };
      } catch {
        return null;
      }
    }

    const image1 = await getImageBase64("reference/reference-face.jpg");
    const image2 = await getImageBase64("reference/reference-face-2.jpg");
    const isCoupleMode = !!image1 && !!image2;

    console.log("Couple mode:", isCoupleMode);

    if (!image1) {
      await supabase
        .from("generation_queue")
        .update({ status: "error", error_message: "Reference image not found" })
        .eq("id", queueId);

      return new Response(
        JSON.stringify({ success: false, reason: "no_reference", message: "Reference image not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== CALL GEMINI API ==========
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, reason: "config_error", message: "GEMINI_API_KEY not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the prompt (single paragraph style)
    const prompt = buildPrompt(packData, scenePrompt, isCoupleMode);
    console.log("Final prompt:", prompt);

    // Build content parts: reference image(s) first, then text prompt
    // According to docs, images come first for reference
    const contentParts: unknown[] = [];

    // Add reference image(s)
    contentParts.push({
      inline_data: { mime_type: image1.mimeType, data: image1.base64 }
    });

    if (isCoupleMode && image2) {
      contentParts.push({
        inline_data: { mime_type: image2.mimeType, data: image2.base64 }
      });
    }

    // Add text prompt
    contentParts.push({ text: prompt });

    // Generation config with image size and aspect ratio support
    const generationConfig: Record<string, unknown> = {
      response_modalities: ["IMAGE", "TEXT"],
    };

    // Add image_config for gemini-3-pro-image-preview model (supports image_size)
    if (model === "gemini-3-pro-image-preview") {
      generationConfig.image_config = {
        aspect_ratio: aspectRatio, // "1:1", "16:9", "9:16", etc.
        image_size: imageSize, // "1K", "2K", "4K"
      };
    }

    console.log("Calling Gemini API with config:", JSON.stringify(generationConfig));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: contentParts }],
          generationConfig,
        }),
      }
    );

    const responseText = await response.text();
    let data: any;

    try {
      data = JSON.parse(responseText);
    } catch {
      console.error("Failed to parse Gemini response:", responseText);
      await supabase
        .from("generation_queue")
        .update({ status: "error", error_message: "Invalid API response" })
        .eq("id", queueId);

      return new Response(
        JSON.stringify({ success: false, reason: "parse_error", message: "Invalid API response" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.ok) {
      console.error("Gemini API error:", { status: response.status, data });

      await supabase
        .from("generation_queue")
        .update({ status: "error", error_message: `API error: ${response.status}` })
        .eq("id", queueId);

      return new Response(
        JSON.stringify({
          success: false,
          reason: "api_error",
          message: data?.error?.message || "API request failed",
          status: response.status,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check finish reason
    const finishReason = data.candidates?.[0]?.finishReason;
    console.log("Finish reason:", finishReason);

    if (finishReason && finishReason !== "STOP" && finishReason !== "MAX_TOKENS") {
      console.error("Generation failed:", JSON.stringify(data));

      const reason = finishReason.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const isPolicy = reason.includes("safety") || reason.includes("prohibited");

      const errorMessage = isPolicy
        ? "Content policy violation"
        : "Model could not generate this image";

      await supabase
        .from("generation_queue")
        .update({ status: "error", error_message: errorMessage })
        .eq("id", queueId);

      return new Response(
        JSON.stringify({ success: false, reason: reason, message: errorMessage }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract image from response
    const parts = data.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: any) => p.inline_data || p.inlineData);
    const imageData = imagePart?.inline_data || imagePart?.inlineData;

    if (!imageData?.data) {
      console.error("No image in response:", JSON.stringify(data));

      await supabase
        .from("generation_queue")
        .update({ status: "error", error_message: "No image data in response" })
        .eq("id", queueId);

      return new Response(
        JSON.stringify({ success: false, reason: "no_image_data", message: "No image data in response" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decode and upload
    const binaryString = atob(imageData.data);
    const imageBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      imageBytes[i] = binaryString.charCodeAt(i);
    }

    const packId = queueItem.packs.pack_id;
    const sceneIdStr = String(sceneId).padStart(2, "0");
    const imagePath = `${packId}/scene-${sceneIdStr}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("generated-images")
      .upload(imagePath, imageBytes, { contentType: "image/jpeg", upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);

      await supabase
        .from("generation_queue")
        .update({ status: "error", error_message: `Upload failed: ${uploadError.message}` })
        .eq("id", queueId);

      return new Response(
        JSON.stringify({ success: false, reason: "upload_error", message: "Failed to upload image" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Success
    await supabase
      .from("generation_queue")
      .update({ status: "success", image_path: imagePath })
      .eq("id", queueId);

    const { data: { publicUrl } } = supabase.storage
      .from("generated-images")
      .getPublicUrl(imagePath);

    console.log("Success:", imagePath);

    return new Response(
      JSON.stringify({ success: true, imageUrl: publicUrl, imagePath }),
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
