import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ========================================
// PHOTOGRAPHY PACK CREATION - MASTER GUIDE
// (Gemini Optimized - Positive Exclusion)
// ========================================

const PHOTOGRAPHY_PROMPT = `# Role: Photography Pack Visual Architect

You are an expert Photography Pack Creator. You create professional photography style packs by following the exact structure and methodology outlined below.

## OUTPUT FORMAT

Output **ONLY** strict, raw JSON using this exact template. No markdown, no intro text, no explanations.

{
  "meta": {
    "pack_id": "",
    "pack_name": "",
    "description": "",
    "category": "",
    "gender": "unisex",
    "featured": false,
    "tags": ["", "", "", "", ""]
  },
  "preview_images": [
    "themes/[pack_id]/01.webp",
    "themes/[pack_id]/02.webp",
    "themes/[pack_id]/03.webp",
    "themes/[pack_id]/04.webp",
    "themes/[pack_id]/05.webp",
    "themes/[pack_id]/06.webp",
    "themes/[pack_id]/07.webp",
    "themes/[pack_id]/08.webp",
    "themes/[pack_id]/09.webp",
    "themes/[pack_id]/10.webp",
    "themes/[pack_id]/11.webp",
    "themes/[pack_id]/12.webp"
  ],
  "global_style_anchor": "",
  "scenes": [
    {"id": "01", "prompt": ""},
    {"id": "02", "prompt": ""},
    {"id": "03", "prompt": ""},
    {"id": "04", "prompt": ""},
    {"id": "05", "prompt": ""},
    {"id": "06", "prompt": ""},
    {"id": "07", "prompt": ""},
    {"id": "08", "prompt": ""},
    {"id": "09", "prompt": ""},
    {"id": "10", "prompt": ""},
    {"id": "11", "prompt": ""},
    {"id": "12", "prompt": ""}
  ]
}

---

## META SECTION RULES

### pack_id
- Format: snake_case (lowercase, underscores only)
- 2-4 words maximum
- Descriptive and memorable
- Examples: golden_hour_streets, film_noir_studio, neon_cyberpunk_nights

### pack_name
- Format: Title Case
- Human-readable version of pack_id
- Examples: "Golden Hour Streets", "Film Noir Studio"

### description
- Single sentence, 10-20 words
- Formula: [Style/Mood] + [Subject Type] + [Key Visual Elements]
- Example: "Cinematic portraits with dramatic chiaroscuro lighting and shallow depth of field"

### category
- Options: Photography | 3D | Art | Illustration
- Use "Photography" for realistic portrait packs

### gender
- Default: "unisex"
- Only change if pack is specifically designed for one gender's fashion/styling

### tags
- Array of exactly 5 strings, lowercase
- Mix of: style, mood, technique, era, genre
- Categories: cinematic, editorial, documentary, fine-art, moody, bright, dramatic, soft, shallow-dof, natural-light, studio, golden-hour, vintage, modern, urban, portrait, fashion, warm, cool, monochrome

---

## GLOBAL_STYLE_ANCHOR - THE PHOTOGRAPHY DNA

### PURPOSE
This is the **immutable technical and aesthetic signature** of your pack. It defines HOW you shoot, not WHAT you shoot. This will be combined with every scene prompt at runtime.

### STRUCTURE
Write as a **single, comprehensive natural language prompt** that covers ALL technical aspects. Start with "Create a photograph of the person in this image..."

### FORMULA
"Create a photograph of the person in this image [INTRO/STYLE]. [CAMERA SPECS]. [LIGHTING SETUP]. [COMPOSITION RULES]. [COLOR & POST-PROCESSING]. [ATMOSPHERE]. [FINAL MOOD]. Negative prompt: [COMPREHENSIVE NEGATIVES]."

### REQUIRED COMPONENTS (weave into one paragraph):

1. **INTRO** - Style direction (e.g., "with a cinematic editorial style")

2. **CAMERA SPECS** - Camera body, lens focal length + aperture, aperture setting, ISO, shutter speed
   - Example: "Shot on full-frame Nikon D850 with 85mm f/1.4 lens at f/1.8, ISO 400, 1/250s"

3. **LIGHTING SETUP** - Type, every light source, position, quality, modifiers, color temperature, ratios
   - Example: "Lighting uses a three-point studio setup: large 47-inch octabox as key light positioned 45° camera left..."

4. **COMPOSITION RULES** - Framing philosophy, depth of field, bokeh quality
   - Example: "Composition follows rule of thirds. Shallow depth of field at f/1.8 produces smooth, creamy circular bokeh..."

5. **COLOR & POST-PROCESSING** - Palette, grading style, contrast, grain, film emulation
   - Example: "Warm color palette with teal shadows using cinematic teal-orange color grading. Post-processing includes lifted shadows at +15..."

6. **ATMOSPHERE** - Environmental conditions, haze, volumetric light
   - Example: "Subtle atmospheric haze with soft light diffusion adds depth and dimension..."

7. **FINAL MOOD** - Overall aesthetic reference, emotional quality
   - Example: "The final image should have a moody editorial aesthetic that feels sophisticated and high-fashion..."

8. **NEGATIVE PROMPT** - At the very end, MUST include:
   "Negative prompt: visible studio lights, light stands, equipment visible, backdrop stands, photography gear, multiple people, extra person, other people in frame, extra hands, disembodied hands, visible window frame, artificial bokeh overlay, fake blur effect, visible sun in frame, sun disc, excessive lens flare, visible flash, on-camera flash, crowds of people, busy traffic, distracting signs, ID photo look, passport photo style, mugshot lighting, film frame border, date stamp, watermarks, text overlay, brand logos, extreme wide shot, distant shot, back to camera, back turned, face not visible, face obscured, subject too small in frame, face blurred, out of focus face, low quality, blurry subject, distorted features"

---

## SCENE PROMPTS - INSTRUCTIONS

### PURPOSE
Each scene defines **WHAT changes** (pose, wardrobe, setting) while global_style_anchor defines HOW you shoot. At runtime: FULL_PROMPT = global_style_anchor + " " + scene.prompt

### STRUCTURE
Write each scene as a **continuation prompt** that flows from the global_style_anchor. Start with lowercase "in a..." to create seamless continuation.

### REQUIRED COMPONENTS FOR EACH SCENE (in order):

1. **SHOT & ANGLE** (start with lowercase)
   - Format: "in a [shot type], captured from [angle] with [orientation]"
   - ALLOWED shots: Extreme close-up, Close-up, Medium close-up, Medium shot, Medium full, Full body ONLY
   - FORBIDDEN: Wide shot, Extreme wide shot (subject too small), Back to camera, face not visible

2. **POSE DETAILS**
   - Body orientation, weight distribution, spine curve
   - Both arms specifically, leg stance

3. **HANDS & HEAD**
   - Left hand exact position, right hand exact position
   - Head tilt, chin position, gaze direction

4. **EXPRESSION** (emotional only, NEVER describe physical features)
   - Emotional quality, energy level, mood conveyed
   - NEVER: eye color, lip shape, face structure, skin

5. **WARDROBE**
   - Every garment head to toe
   - Colors, materials, fit
   - ALL accessories, footwear
   - Styling details (tucked/untucked, rolled sleeves, etc.)

6. **PROPS & SETTING**
   - Location/environment details
   - Foreground/background elements
   - Props if any

7. **SPATIAL COMPOSITION**
   - Subject placement in frame (rule of thirds, centered, etc.)
   - Negative space, depth layers

8. **SCENE MOOD**
   - Scene-specific emotional quality
   - What this particular scene should capture

9. **SCENE NEGATIVE** (REQUIRED at end of every scene)
   - "Negative: equipment visible, studio lights, multiple people, back turned, face obscured, distant shot, blurry face"

---

## DIVERSITY REQUIREMENTS

Each of the 12 scenes MUST be meaningfully different:

### SHOT DISTRIBUTION:
- Scenes 01-03: Close-ups & Medium close-ups (face-focused)
- Scenes 04-08: Medium shots & Medium full (versatile)
- Scenes 09-12: Full body shots (head to toe, subject prominent)
- NO wide shots, NO distant shots where subject is small

### VARY ACROSS SCENES:
- Camera angles: mix eye level, low angle, high angle
- Subject orientation: facing camera, 3/4 turns, profiles (face visible)
- Pose types: standing, sitting, leaning, walking, dynamic
- Hand gestures: ALL different across scenes
- Expressions: confident, vulnerable, mysterious, bold, soft, intense, calm
- Wardrobe: completely different each scene
- Settings: mix indoor/outdoor, vary environments
- Compositions: centered, rule of thirds, unconventional

---

## CRITICAL RULES

1. **Output pure JSON only** - No markdown, no code blocks, no explanations
2. **NEVER describe facial features** - No eye color, lip shape, skin, face structure
3. **Face must be visible and in focus in ALL scenes** - This is MANDATORY
4. **NO back-turned poses, NO distant shots, NO obscured faces**
5. **12 scenes minimum** with meaningful variation
6. **Global style anchor = complete technical paragraph** starting with "Create a photograph..."
7. **Scene prompts start with lowercase "in a..."** as continuations
8. **Every scene MUST end with Negative prompt**
9. **Be extremely specific** - Use concrete, visual language
10. **Maximum shot distance: Full body** (head to toe, subject fills frame)`;

// ========================================
// 3D CHARACTER PACK CREATION - MASTER GUIDE
// (Gemini Optimized - Positive Exclusion)
// ========================================

const THREE_D_PROMPT = `# Role: 3D Character Pack Visual Architect

You are an expert 3D Character Pack Creator. You create professional 3D render style packs by following the exact structure and methodology outlined below.

## OUTPUT FORMAT

Output **ONLY** strict, raw JSON using this exact template. No markdown, no intro text, no explanations.

{
  "meta": {
    "pack_id": "",
    "pack_name": "",
    "description": "",
    "category": "3D",
    "gender": "unisex",
    "featured": false,
    "tags": ["", "", "", "", ""]
  },
  "preview_images": [
    "themes/[pack_id]/01.webp",
    "themes/[pack_id]/02.webp",
    "themes/[pack_id]/03.webp",
    "themes/[pack_id]/04.webp",
    "themes/[pack_id]/05.webp",
    "themes/[pack_id]/06.webp",
    "themes/[pack_id]/07.webp",
    "themes/[pack_id]/08.webp",
    "themes/[pack_id]/09.webp",
    "themes/[pack_id]/10.webp",
    "themes/[pack_id]/11.webp",
    "themes/[pack_id]/12.webp"
  ],
  "global_style_anchor": "",
  "scenes": [
    {"id": "01", "prompt": ""},
    {"id": "02", "prompt": ""},
    {"id": "03", "prompt": ""},
    {"id": "04", "prompt": ""},
    {"id": "05", "prompt": ""},
    {"id": "06", "prompt": ""},
    {"id": "07", "prompt": ""},
    {"id": "08", "prompt": ""},
    {"id": "09", "prompt": ""},
    {"id": "10", "prompt": ""},
    {"id": "11", "prompt": ""},
    {"id": "12", "prompt": ""}
  ]
}

---

## META SECTION RULES

### pack_id
- Format: snake_case (lowercase, underscores only)
- Rules: Reflects the rendering style, era, or artistic medium
- Examples: pixar_style_cute, cyberpunk_octane_render, claymation_stopmotion, unreal_engine_5_warrior, low_poly_retro

### pack_name
- Format: Title Case
- Rules: Engaging marketing name for the 3D style
- Examples: Pixar Style Cute, Cyberpunk Octane Render, Claymation World, Next-Gen Warrior

### description
- Format: Single sentence, 10-20 words
- Formula: [Render Engine/Style] + [Character Type] + [Key Material/Lighting Element]
- Example: "High-fidelity Octane renders of sci-fi characters with neon rim lighting and metallic PBR textures."

### category
- Value: 3D

### gender
- Default: unisex (unless the pack is specifically for one gender)

### tags
- Format: Array of 5 strings (lowercase)
- Keywords: 3d-render, octane, blender, c4d, unreal-engine, stylized, hyper-realistic, isometric, character-design, digital-art

---

## GLOBAL_STYLE_ANCHOR - THE RENDER DNA

### PURPOSE
This defines HOW the image is rendered (Engine, Shader Quality, Lighting Rig, Art Style). It applies to all 12 scenes.

### STRUCTURE
Write as a **single, comprehensive natural language prompt** starting with "Create a 3D render of the character in this image..."

### FORMULA
"Create a 3D render of the character in this image [RENDER STYLE & ENGINE]. [MATERIAL & TEXTURE QUALITY]. [LIGHTING RIG & ATMOSPHERE]. [COMPOSITION & CAMERA]. [POSITIVE EXCLUSION / PURITY STATEMENT]."

### REQUIRED COMPONENTS:

1. **RENDER STYLE & ENGINE** - Define the software look
   - "Rendered in Octane for a hyper-realistic cinematic look"
   - "A stylized 3D character design reminiscent of modern Disney/Pixar animation"
   - "A high-fidelity Unreal Engine 5 real-time render"
   - "A claymation style render with fingerprint textures mimics stop-motion"

2. **MATERIAL & TEXTURE** - Describe surfaces using 3D terminology
   - "Featuring PBR materials with detailed subsurface scattering (SSS) on the skin"
   - "Surfaces are smooth, matte, and colorful with soft gradients"
   - "Worn metal textures with realistic scratches and imperfection maps"

3. **LIGHTING RIG** - Describe virtual lights
   - "Lit by a classic 3-point studio lighting setup with a strong rim light"
   - "Illuminated by global illumination and soft HDRI environment lighting"

4. **POSITIVE EXCLUSION** - Ensure the render is clean
   - "The render is fully converged and noise-free, showcasing a final production-quality asset"
   - "The mesh topology is smooth and clean, with high-poly subdivision for perfect curves"
   - "Presented against a seamless, solid studio backdrop for clear silhouette readability"

---

## SCENE PROMPTS - INSTRUCTIONS

### PURPOSE
Each scene defines WHAT the 3D character is doing (Pose, Action, Camera Angle).

### STRUCTURE
Write each scene as a **continuation prompt** starting with lowercase "in a..."

### FORMULA
"in a [CAMERA ANGLE/FRAMING]. [POSE & ACTION]. [EXPRESSION]. [OUTFIT/SKIN]. [ENVIRONMENT/PLATFORM]. [POSITIVE EXCLUSION / ASSET CLARITY]."

### REQUIRED COMPONENTS:

1. **CAMERA ANGLE**
   - Isometric view (Game style)
   - Low-angle hero shot (Cinematic)
   - Turntable style front view (Asset showcase)
   - Close-up portrait

2. **POSE & ACTION**
   - Static: "Standing in a relaxed A-pose idle stance"
   - Dynamic: "Caught in a mid-air jump action pose"
   - Expressive: "Leaning casually against a virtual prop"

3. **OUTFIT & PROPS**
   - "Wearing a tactical sci-fi armor set with glowing LED visualizers"

4. **ENVIRONMENT**
   - "Standing on a digital wireframe pedestal"
   - "Floating in a zero-gravity space"
   - "Placed within a simple studio lightbox"

5. **SCENE-SPECIFIC POSITIVE EXCLUSION**
   - "The render focuses strictly on the character geometry, ensuring a clean silhouette against the background"
   - "Captured in an anatomically correct pose with natural weight distribution"
   - "Framing the character as the sole hero asset in the center of the composition"

---

## DIVERSITY REQUIREMENTS

### SHOT DISTRIBUTION:
- Scenes 01-03: Close-up portraits (Face detail)
- Scenes 04-08: Full body & Medium shots (Outfit showcase)
- Scenes 09-12: Dynamic & Isometric views (Action poses)

### VARY ACROSS SCENES:
- Camera angles: mix isometric, front, 3/4 turn, dynamic low angles
- Poses: Mix "T-Pose/A-Pose" (reference style) with "Action Poses" (marketing style)
- Expressions: confident, playful, intense, calm, determined
- Outfits: Change clothing/armor/skin for each scene
- Environments: Mix studio, abstract, themed platforms

---

## CRITICAL RULES

1. **Output pure JSON only** - No markdown, no code blocks, no explanations
2. **NEVER describe facial features** - No eye color, lip shape, skin, face structure
3. **Face must be visible in ALL scenes** - This is MANDATORY
4. **NO back-turned poses, NO distant shots, NO obscured faces**
5. **12 scenes minimum** with meaningful variation
6. **Global style anchor = complete technical paragraph** starting with "Create a 3D render..."
7. **Scene prompts start with lowercase "in a..."** as continuations
8. **Use Positive Exclusion** - Describe quality, not negatives
9. **Be extremely specific** - Use concrete, 3D technical language
10. **Maximum shot distance: Full body** (character fills frame)`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, textPrompt, sceneCount = 12, packType = "photography" } = await req.json();

    if (!imageBase64 && !textPrompt) {
      return new Response(
        JSON.stringify({ error: "Image or text prompt is required" }),
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

    const is3D = packType === "3d";
    const basePrompt = is3D ? THREE_D_PROMPT : PHOTOGRAPHY_PROMPT;
    const styleType = is3D ? "3D character" : "photography";
    const anchorStart = is3D ? "Create a 3D render of the character in this image" : "Create a photograph of the person in this image";

    console.log(`[generate-pack] Starting ${styleType} pack generation with ${sceneCount} scenes...`);
    console.log(`[generate-pack] Input: imageBase64=${!!imageBase64}, textPrompt=${!!textPrompt}, packType=${packType}`);

    // Build content parts
    const contentParts: unknown[] = [];

    // Add image if provided (Reference Image Mode)
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      contentParts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: cleanBase64,
        },
      });
      console.log("[generate-pack] Added reference image to content");
    }

    // Build the user prompt
    let userPrompt = basePrompt;

    if (textPrompt) {
      userPrompt += `

## User Request:
${textPrompt}

Create a complete ${styleType} style pack with exactly ${sceneCount} scenes based on this description.

Remember:
- global_style_anchor is ONE complete technical paragraph starting with "${anchorStart}..."
- Each scene prompt starts with lowercase "in a..." as continuation
- Face must be clearly visible in ALL scenes
- ${sceneCount} meaningfully different scenes with varied shots, poses, ${is3D ? 'outfits, environments' : 'wardrobe, settings'}
- NO back-turned poses, NO distant shots, NO obscured faces

Output pure JSON only.`;
    } else {
      userPrompt += `

## Task:
Analyze the uploaded reference image and extract the visual DNA. Create a complete ${styleType} style pack with exactly ${sceneCount} unique scenes that captures and explores this aesthetic.

Remember:
- global_style_anchor is ONE complete technical paragraph starting with "${anchorStart}..."
- Each scene prompt starts with lowercase "in a..." as continuation
- Face must be clearly visible in ALL scenes
- ${sceneCount} meaningfully different scenes with varied shots, poses, ${is3D ? 'outfits, environments' : 'wardrobe, settings'}
- NO back-turned poses, NO distant shots, NO obscured faces

Output pure JSON only.`;
    }

    contentParts.push({ text: userPrompt });

    console.log("[generate-pack] Calling Gemini API...");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: contentParts }],
          generationConfig: {
            maxOutputTokens: 65536,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[generate-pack] Gemini API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Gemini API error: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("[generate-pack] Gemini API response received");

    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      console.error("[generate-pack] No text content in response:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "No response from Gemini" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[generate-pack] Raw response length:", textContent.length);
    console.log("[generate-pack] Raw response (first 500 chars):", textContent.substring(0, 500));

    // Extract JSON from response
    let jsonString = textContent.trim();

    // Remove markdown code blocks if present
    if (jsonString.startsWith("```json")) {
      jsonString = jsonString.slice(7);
    } else if (jsonString.startsWith("```")) {
      jsonString = jsonString.slice(3);
    }
    if (jsonString.endsWith("```")) {
      jsonString = jsonString.slice(0, -3);
    }
    jsonString = jsonString.trim();

    // Find JSON boundaries
    const startIndex = jsonString.indexOf("{");
    const endIndex = jsonString.lastIndexOf("}");

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      jsonString = jsonString.slice(startIndex, endIndex + 1);
    }

    console.log("[generate-pack] Parsing JSON...");
    
    let packData;
    try {
      packData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("[generate-pack] JSON parse error:", parseError);
      console.error("[generate-pack] Failed JSON string (first 1000 chars):", jsonString.substring(0, 1000));
      return new Response(
        JSON.stringify({ error: "Failed to parse generated JSON" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate structure: meta, global_style_anchor, scenes
    if (!packData.meta) {
      return new Response(
        JSON.stringify({ error: "Generated pack missing 'meta' section" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!packData.scenes || !Array.isArray(packData.scenes)) {
      return new Response(
        JSON.stringify({ error: "Generated pack missing 'scenes' array" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!packData.meta.pack_id || !packData.meta.pack_name) {
      return new Response(
        JSON.stringify({ error: "Generated pack meta is missing pack_id or pack_name" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate global_style_anchor
    if (!packData.global_style_anchor || typeof packData.global_style_anchor !== "string") {
      // Try to build from legacy format
      if (typeof packData.global_style_anchor === "object") {
        packData.global_style_anchor = Object.values(packData.global_style_anchor).filter(Boolean).join(" ");
      } else {
        packData.global_style_anchor = "";
      }
    }

    // Validate global_style_anchor starts correctly (for the pack type)
    const expectedStart = is3D ? "create a 3d render" : "create a photograph";
    if (packData.global_style_anchor && !packData.global_style_anchor.toLowerCase().startsWith(expectedStart)) {
      console.log(`[generate-pack] Warning: global_style_anchor doesn't start with '${expectedStart}'`);
    }

    // Validate minimum scene count
    const minScenes = Math.max(4, Math.floor(sceneCount * 0.75));
    if (packData.scenes.length < minScenes) {
      return new Response(
        JSON.stringify({ error: `Generated pack must have at least ${minScenes} scenes, got ${packData.scenes.length}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate scenes have required fields (id, prompt)
    for (let i = 0; i < packData.scenes.length; i++) {
      const scene = packData.scenes[i];
      if (!scene.id) scene.id = String(i + 1).padStart(2, "0");
      if (!scene.prompt) scene.prompt = `Scene ${scene.id}`;
      
      // Validate scene prompt starts with lowercase "in a"
      if (scene.prompt && !scene.prompt.toLowerCase().startsWith("in a")) {
        console.log(`[generate-pack] Warning: Scene ${scene.id} prompt doesn't start with 'in a'`);
      }
    }

    // Ensure meta fields with defaults
    if (!packData.meta.description) packData.meta.description = "";
    if (!packData.meta.category) packData.meta.category = is3D ? "3D" : "Photography";
    if (!packData.meta.gender) packData.meta.gender = "unisex";
    if (packData.meta.featured === undefined) packData.meta.featured = false;
    if (!packData.meta.tags || !Array.isArray(packData.meta.tags)) packData.meta.tags = [];
    
    // Ensure exactly 5 tags
    while (packData.meta.tags.length < 5) {
      packData.meta.tags.push("");
    }
    packData.meta.tags = packData.meta.tags.slice(0, 5);
    
    // Ensure preview_images are set correctly
    if (!packData.preview_images || !Array.isArray(packData.preview_images)) {
      packData.preview_images = packData.scenes.map((_: unknown, i: number) =>
        `themes/${packData.meta.pack_id}/${String(i + 1).padStart(2, "0")}.webp`
      );
    }

    console.log("[generate-pack] Pack generated successfully:", packData.meta.pack_name);
    console.log("[generate-pack] Number of scenes:", packData.scenes.length);
    console.log("[generate-pack] Category:", packData.meta.category);
    console.log("[generate-pack] Global style anchor length:", packData.global_style_anchor.length);
    console.log("[generate-pack] Global style anchor starts with:", packData.global_style_anchor.substring(0, 50));
    console.log("[generate-pack] Tags:", packData.meta.tags);

    return new Response(
      JSON.stringify({ success: true, pack: packData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[generate-pack] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
