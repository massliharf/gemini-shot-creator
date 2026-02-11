import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const INPAINTING_PROMPT = `Please perform a strict inpainting (precise editing) task on these images.

**Task:** Composite the transparent glasses asset from the second image onto the eyes of the subject in the main photo (first image).

**Critical Constraints:**

1. **Pixel-Perfect Preservation:** I require absolute preservation of the base image. Do NOT alter, regenerate, re-light, or modify any pixels outside of the exact area where the glasses are placed. The background, skin texture, and hair must remain 100% identical to the original photo.

2. **Realistic Fit:** Place the glasses realistically, matching the perspective and angle of the subject's face.

3. **Scope:** Your only intervention should be adding the glasses asset. Leave the rest of the image untouched.`;

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resolvedModel = model === "pro"
      ? "google/gemini-3-pro-image-preview"
      : "google/gemini-2.5-flash-image";

    console.log("=== GLASSES GENERATION ===");
    console.log("Model:", resolvedModel);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: resolvedModel,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: INPAINTING_PROMPT },
              {
                type: "image_url",
                image_url: { url: `data:${photoMimeType || "image/jpeg"};base64,${photoBase64}` },
              },
              {
                type: "image_url",
                image_url: { url: `data:${glassesMimeType || "image/png"};base64,${glassesBase64}` },
              },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      const msg = response.status === 429
        ? "Rate limit exceeded. Please try again later."
        : "Failed to generate image";
      return new Response(
        JSON.stringify({ error: msg }),
        { status: response.status === 429 ? 429 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error("No image in response:", JSON.stringify(data).substring(0, 500));
      return new Response(
        JSON.stringify({ error: "No image returned from AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
