import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const INPAINTING_PROMPT = `Technical Operation: Strict Overlay Compositing.

**Task:** Perform a precise technical overlay. Place the provided transparent PNG glasses asset (second image) directly over the eyes of the subject in the base photo (first image).

**HARD CONSTRAINTS (Must Be Followed Exactly):**

1. **NO REGENERATION:** Do not regenerate, redraw, re-light, or reinterpret the base image in any way.

2. **PIXEL-EXACT PRESERVATION:** The entire area outside of the immediate glasses boundary must be a bit-for-bit, pixel-exact match to the original source photo. Do not smooth skin, do not change grain, do not alter background details.

3. **ASPECT RATIO & RESOLUTION:** The output must maintain the exact original aspect ratio and resolution of the provided base photo.

4. **Transparency Handling:** Respect the alpha channel transparency of the PNG asset perfectly. The glasses should just "sit" on top of the existing pixels.`;

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

    const aiResp = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
        },
      }),
    });

    if (!aiResp.ok) {
      const errorText = await aiResp.text();
      console.error("Gemini API error:", aiResp.status, errorText);
      const msg = aiResp.status === 429
        ? "Rate limit exceeded. Please try again later."
        : `Gemini API error: ${aiResp.status}`;
      return new Response(
        JSON.stringify({ error: msg }),
        { status: aiResp.status === 429 ? 429 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResp.json();

    const finishReason = aiData.candidates?.[0]?.finishReason;
    if (finishReason && !["STOP", "MAX_TOKENS"].includes(finishReason)) {
      console.error("Generation blocked:", finishReason);
      return new Response(
        JSON.stringify({ error: "Generation blocked: " + finishReason }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      return new Response(
        JSON.stringify({ error: "No image in response" }),
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
