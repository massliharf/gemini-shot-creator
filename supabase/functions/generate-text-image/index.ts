import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODELS = {
  flash: "gemini-2.5-flash-image",
  "flash-3.1": "gemini-3.1-flash-image-preview",
  pro: "gemini-3-pro-image-preview",
} as const;

const ASPECT_RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"];

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
    const { prompt, model = "flash", aspectRatio = "1:1", resolution = "1K", referenceImages = [] } = await req.json();

    // Auth
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

    if (!prompt?.trim()) {
      return new Response(
        JSON.stringify({ success: false, message: "Prompt is required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve model
    let resolvedModel: string;
    if (model === "flash" || model === "gemini-2.5-flash-image") {
      resolvedModel = MODELS.flash;
    } else if (model === "flash-3.1" || model === "gemini-3.1-flash-image-preview") {
      resolvedModel = MODELS["flash-3.1"];
    } else if (model === "pro" || model === "gemini-3-pro-image-preview") {
      resolvedModel = MODELS.pro;
    } else {
      resolvedModel = MODELS.flash;
    }
    const isProModel = resolvedModel === MODELS.pro || resolvedModel === MODELS["flash-3.1"];

    const validAspectRatio = ASPECT_RATIOS.includes(aspectRatio) ? aspectRatio : "1:1";
    const validResolution = ["1K", "2K", "4K"].includes(resolution) ? resolution : "1K";

    console.log("=== TEXT-TO-IMAGE REQUEST ===");
    console.log("Model:", resolvedModel, "AR:", validAspectRatio, "Res:", isProModel ? validResolution : "N/A");

    const generationConfig: Record<string, unknown> = {
      responseModalities: ["IMAGE", "TEXT"],
    };

    if (isProModel) {
      generationConfig.imageConfig = { aspectRatio: validAspectRatio, imageSize: validResolution };
    } else {
      generationConfig.imageConfig = { aspectRatio: validAspectRatio };
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${GEMINI_API_KEY}`;

    const aiResp = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig,
      }),
    });

    if (!aiResp.ok) {
      const errorText = await aiResp.text();
      console.error("Gemini error:", aiResp.status, errorText);
      return new Response(
        JSON.stringify({ success: false, message: `Gemini API error: ${aiResp.status}`, details: errorText }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResp.json();
    const finishReason = aiData.candidates?.[0]?.finishReason;

    if (finishReason && !["STOP", "MAX_TOKENS"].includes(finishReason)) {
      return new Response(
        JSON.stringify({ success: false, message: "Generation blocked: " + finishReason }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const responseParts = aiData.candidates?.[0]?.content?.parts || [];
    const imagePart = responseParts.find((p: any) => {
      const inline = p.inlineData || p.inline_data;
      const mt = inline?.mimeType || inline?.mime_type;
      return typeof mt === "string" && mt.startsWith("image/");
    });

    const inline = imagePart?.inlineData || imagePart?.inline_data;
    if (!inline?.data) {
      return new Response(
        JSON.stringify({ success: false, message: "No image generated" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const imageBase64 = inline.data;
    const mimeType = inline.mimeType || inline.mime_type || "image/png";
    const imageBytes = base64ToBytes(imageBase64);

    // Upload to storage
    const ext = extFromMime(mimeType);
    const timestamp = Date.now();
    const imagePath = `text-gen/${user.id}/${timestamp}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("generated-images")
      .upload(imagePath, imageBytes, { contentType: mimeType, upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to upload image" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { publicUrl } } = supabase.storage
      .from("generated-images")
      .getPublicUrl(imagePath);

    // Save to DB
    await supabase.from("text_generations").insert({
      user_id: user.id,
      prompt: prompt.substring(0, 5000),
      model: resolvedModel,
      aspect_ratio: validAspectRatio,
      resolution: validResolution,
      image_path: imagePath,
      image_url: publicUrl,
    });

    return new Response(
      JSON.stringify({ success: true, imageUrl: publicUrl, imagePath }),
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
