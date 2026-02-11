import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const INPAINTING_PROMPT = `Place the glasses from the second image onto the person's face in the first image. Position them naturally over the eyes, matching the face angle and size. Keep the original photo completely unchanged — same background, lighting, skin, hair, clothes, and all details. Only add the glasses on top. Output the full photo with glasses added.`;

const base64ToBytes = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const MODELS: Record<string, string> = {
  flash: "gemini-2.5-flash-image",
  pro: "gemini-3-pro-image-preview",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { photoBase64, photoMimeType, glassesBase64, glassesMimeType, model } = await req.json();

    if (!photoBase64) {
      return new Response(
        JSON.stringify({ error: "Photo is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!glassesBase64) {
      return new Response(
        JSON.stringify({ error: "Glasses asset is required" }),
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

    const resolvedModel = model === "pro" ? MODELS.pro : MODELS.flash;
    console.log("=== GLASSES GENERATION ===");
    console.log("Model:", resolvedModel);

    const parts = [
      { inline_data: { mime_type: photoMimeType || "image/jpeg", data: photoBase64 } },
      { inline_data: { mime_type: glassesMimeType || "image/png", data: glassesBase64 } },
      { text: INPAINTING_PROMPT },
    ];

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${GEMINI_API_KEY}`;
    const safetySettings = [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ];

    const requestBody = JSON.stringify({
      contents: [{ parts }],
      safetySettings,
      generationConfig: {
        responseModalities: ["IMAGE", "TEXT"],
      },
    });

    let aiData = null;
    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      console.log(`Attempt ${attempt}/${MAX_RETRIES}`);
      
      const aiResp = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      });

      if (!aiResp.ok) {
        const errorText = await aiResp.text();
        console.error("Gemini API error:", aiResp.status, errorText);
        if (aiResp.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (attempt === MAX_RETRIES) {
          return new Response(
            JSON.stringify({ error: `Gemini API error: ${aiResp.status}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        continue;
      }

      aiData = await aiResp.json();

      // Check for prompt-level block (promptFeedback.blockReason)
      const promptBlock = aiData.promptFeedback?.blockReason;
      if (promptBlock) {
        console.warn(`Attempt ${attempt} prompt blocked: ${promptBlock}`);
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 1500 * attempt));
          continue;
        }
        return new Response(
          JSON.stringify({ error: "Generation was blocked by the model. Please try a different photo." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const finishReason = aiData.candidates?.[0]?.finishReason;
      console.log("finishReason:", finishReason, "parts:", aiData.candidates?.[0]?.content?.parts?.length || 0);

      if (finishReason && !["STOP", "MAX_TOKENS"].includes(finishReason)) {
        console.warn(`Attempt ${attempt} blocked: ${finishReason}`);
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
          continue;
        }
        return new Response(
          JSON.stringify({ error: "Generation was blocked by the model. Please try a different photo or glasses." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Success - break out of retry loop
      break;
    }

    if (!aiData) {
      return new Response(
        JSON.stringify({ error: "All generation attempts failed. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const responseParts = aiData.candidates?.[0]?.content?.parts || [];
    const imagePart = responseParts.find((p: Record<string, unknown>) => {
      const inline = p.inlineData || p.inline_data;
      const mt = (inline as Record<string, unknown>)?.mimeType || (inline as Record<string, unknown>)?.mime_type;
      return typeof mt === "string" && mt.startsWith("image/");
    });

    const inline = imagePart?.inlineData || imagePart?.inline_data;
    if (!inline?.data) {
      console.error("No image data found. Full response:", JSON.stringify(aiData).substring(0, 1000));
      return new Response(
        JSON.stringify({ error: "No image in response. The model may not support this operation. Try again or use a different model." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const imageBase64 = inline.data;
    const mimeType = inline.mimeType || inline.mime_type || "image/png";
    const imageUrl = `data:${mimeType};base64,${imageBase64}`;

    console.log("Glasses image generated successfully");

    return new Response(
      JSON.stringify({ imageUrl }),
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
