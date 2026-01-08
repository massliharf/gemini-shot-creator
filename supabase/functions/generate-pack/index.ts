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
    "category": "Photography",
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
- Rules: Descriptive, reflects the visual style or era
- Examples: golden_hour_streets, film_noir_studio, neon_cyberpunk_nights, soft_minimalist_editorial

### pack_name
- Format: Title Case
- Rules: Human-readable version of pack_id
- Examples: Golden Hour Streets, Film Noir Studio, Soft Minimalist Editorial

### description
- Format: Single sentence, 10-20 words
- Formula: [Style/Mood] + [Subject Type] + [Key Visual Elements]
- Example: "Cinematic portraits with dramatic chiaroscuro lighting and shallow depth of field."

### category
- Value: Photography

### gender
- Default: unisex (unless the pack is specifically designed for one gender)

### tags
- Format: Array of 5 strings (lowercase)
- Mix: Style, mood, lighting, era, genre
- Examples: ["cinematic", "moody", "urban", "shallow-dof", "editorial"]

---

## GLOBAL_STYLE_ANCHOR - THE PHOTOGRAPHY DNA

### PURPOSE
This defines HOW the image is created (Camera, Lighting, Color, Post-Processing). It applies to all 12 scenes.

### STRATEGY FOR GEMINI MODELS
Gemini models respond best to descriptive natural language. Do not use lists. Write a cohesive narrative description.

**CRITICAL: Use Positive Exclusion.** Instead of saying "no equipment visible," describe the "cleanliness" of the framing.

**LIGHTING RULE:** Do NOT use hardware names like "lightbox," "softbox," or "umbrella" if possible. These terms often cause the AI to draw the object itself. Instead, describe the QUALITY of the light (e.g., "diffused large area lighting," "soft window-style illumination").

### FORMULA
"Create a photograph of the person in this image [INTRO/STYLE]. [CAMERA SPECS & OPTICAL CHARACTERISTICS]. [LIGHTING QUALITY & ATMOSPHERE]. [COLOR PALETTE & GRADING]. [POSITIVE EXCLUSION / PURITY STATEMENT]."

### COMPONENTS:

1. **CAMERA & OPTICS** - Define the lens and sensor look
   - Examples:
     - "Captured on a high-resolution full-frame sensor with an 85mm portrait lens at f/1.8."
     - "Shot on 35mm analogue film stock with a 50mm lens for a natural perspective."

2. **LIGHTING QUALITY** (Not Hardware) - Describe how the light behaves, not the tool used
   - BAD: "Using a large lightbox and a reflector." (Risk: AI draws a box)
   - GOOD: "Illuminated by a soft, directional light source from the left that wraps gently around the features, creating smooth transitions between highlight and shadow."
   - GOOD: "Lit by harsh, high-contrast sunlight creating dramatic, defined shadows."

3. **COLOR & GRADING** - Define the aesthetic finish
   - Examples:
     - "Processed with a teal and orange cinematic grade, featuring lifted shadows and preserved highlights."
     - "Finished in classic black and white with deep, rich blacks and silvery mid-tones."

4. **POSITIVE EXCLUSION** (The "Anti-Negative" Strategy) - Prevent unwanted elements by enforcing purity
   - To prevent Studio Gear: "The composition is tightly framed and pristine, ensuring a clean aesthetic devoid of any technical equipment or surroundings."
   - To ensure focus: "The image is a dedicated portrait with a razor-sharp focus on the subject's face, blurring all background distractions into smooth bokeh."

### GLOBAL_STYLE_ANCHOR EXAMPLES

**Example 1: Clean Studio (No Lightbox artifacts)**
"Create a photograph of the person in this image with a high-end editorial studio aesthetic. Captured on a Hasselblad medium format camera with an 80mm lens at f/5.6 for exceptional clarity. The lighting creates a sculpted, flattering look using large, diffused area illumination from above, resulting in soft shadows under the chin without any harsh hotspots. The background is a pure, infinite grey tone. The image is processed with a modern commercial grade, featuring true-to-life skin tones and vibrant contrast. The composition is pristine and minimalist, focusing entirely on the subject within a clean space, ensuring a polished look free of any distractions."

**Example 2: Cinematic Outdoor**
"Create a photograph of the person in this image with a moody, cinematic street photography style. Shot on a Leica M10 with a 35mm Summilux lens at f/1.4. The scene is illuminated by practical city lights and ambient moonlight, creating a low-key atmosphere with cool blue tones and warm highlights. There is a subtle atmospheric mist that diffuses the light sources. The color grading emulates Kodak Portra 800 film with fine grain and warm shadows. The framing focuses exclusively on the solitary subject, capturing a moment of quiet isolation where the surroundings are blurred and atmospheric."

---

## SCENE PROMPTS - INSTRUCTIONS

### PURPOSE
Each scene defines WHAT happens (Pose, Wardrobe, Setting). Scenes are continuations of the global anchor.

### RULE: Start with lowercase "in a..."

### FORMULA
"in a [SHOT TYPE] captured from [ANGLE]. [POSE & ACTION]. [EXPRESSION]. [WARDROBE]. [SETTING & CONTEXT]. [POSITIVE EXCLUSION / FRAMING CONSTRAINT]."

### THE POSITIVE EXCLUSION STRATEGY FOR SCENES

Instead of using negative prompts, use phrases that enforce the desired outcome:

- To ensure face visibility: "...captured in a composition where the subject's face is clearly visible, sharply in focus, and prominently featured."
- To prevent back-turned poses: "...with the subject engaging directly with the camera lens, chest and face turned forward."
- To prevent wide/distant shots: "...framed tightly to prioritize the subject's presence, ensuring they fill the majority of the frame."

### COMPONENTS:

1. **SHOT & ANGLE**
   - GOOD: close-up, medium shot, full body shot (head to toe)
   - FORBIDDEN: wide shot, extreme long shot (Subject becomes too small)

2. **POSE DETAILS** - Be specific about hands and body weight
   - "Standing with weight shifted to the left hip, right hand resting in a pocket, left hand adjusting the lapel."

3. **WARDROBE** - Describe textures, colors, and fit
   - "Wearing a textured beige wool trench coat over a charcoal turtleneck and fitted black trousers."

4. **SETTING** - Describe the environment but emphasize cleanliness/emptiness if needed
   - "Positioned in a modern concrete hallway with clean lines."

5. **SCENE-SPECIFIC POSITIVE EXCLUSION** - End every scene with a sentence that locks in quality
   - Standard Ending: "The shot is composed as a pristine, professional portrait, ensuring the subject is the sole focus against a distraction-free background."

### SCENE PROMPT EXAMPLES

**Scene Example 1 (Studio):**
"in a medium shot captured from eye level. The subject is seated on a simple wooden stool, leaning slightly forward with elbows resting on knees. Hands are clasped loosely together in a relaxed, confident gesture. The head is tilted slightly to the right, looking directly into the lens with a calm, engaging expression. Wearing a white linen button-down shirt with rolled sleeves and navy chinos. The setting is a minimalist space with no props other than the stool. The image is framed to ensure the subject's face is the absolute focal point, sharp and clear, creating an intimate connection free of any visual clutter or additional subjects."

**Scene Example 2 (Urban):**
"in a full body shot captured from a low angle. The subject is walking confidently toward the camera, caught mid-stride with the right leg forward. The left arm swings naturally by their side, while the right hand holds a leather messenger bag strap. Expression is focused and determined. Dressed in a sharp charcoal suit with a crisp white shirt and no tie. The background is a blurred architectural facade of glass and steel. The composition captures the subject as the solitary figure in the frame, emphasizing their dominance in the space without any other pedestrians or traffic visible."

---

## CONSISTENCY & DIVERSITY RULES

### 1. THE SEPARATION LAW (Crucial for Gemini)
- **Global Anchor = Technical Specs** (Camera, Light Quality, Color)
- **Scene Prompt = Content** (Pose, Clothes, Location)
- NEVER mix them. Do not put "wearing a hat" in Global. Do not put "soft lighting" in Scene.

### 2. DIVERSITY ACROSS 12 SCENES
Ensure your 12 scenes cover:
- **Distances:** 4 Close-ups, 4 Medium, 4 Full Body
- **Angles:** Eye level, Low angle, High angle
- **Wardrobe:** Change the outfit description significantly for every scene
- **Poses:** Standing, sitting, walking, leaning

### 3. POSITIVE FRAMING CHECKLIST
Before saving, check your prompts:
- Did you use "Negative"? DELETE IT.
- Did you use "Lightbox/Softbox"? DELETE IT. Use "Diffused Light" or "Area Lighting".
- Replace negatives with positive constraints:
  - Instead of "Negative: blurry face" → Write "The face is rendered with razor-sharp precision and clarity."
  - Instead of "Negative: bad anatomy" → Write "The subject creates a natural, anatomically perfect pose."
  - Instead of "Negative: cropped head" → Write "The framing creates generous headroom, capturing the full subject."

---

## CRITICAL RULES

1. **Output pure JSON only** - No markdown, no code blocks, no explanations
2. **NEVER describe facial features** - No eye color, lip shape, skin, face structure
3. **Face must be visible and in focus in ALL scenes** - This is MANDATORY
4. **NO back-turned poses, NO distant shots, NO obscured faces**
5. **12 scenes minimum** with meaningful variation
6. **Global style anchor = complete technical paragraph** starting with "Create a photograph..."
7. **Scene prompts start with lowercase "in a..."** as continuations
8. **Use POSITIVE EXCLUSION** - Never use "Negative prompt:" - enforce quality through positive descriptions
9. **Be extremely specific** - Use concrete, visual language
10. **Maximum shot distance: Full body** (head to toe, subject fills frame)
11. **NO hardware names** like lightbox, softbox, umbrella - describe light QUALITY instead`;

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

### STRATEGY FOR GEMINI MODELS
Gemini models respond best to descriptive natural language. Do not use lists. Write a cohesive narrative description.

**CRITICAL: Use Positive Exclusion.** Instead of saying "no artifacts visible," describe the "cleanliness" and "production quality" of the render.

### FORMULA
"Create a 3D render of the character in this image [RENDER STYLE & ENGINE]. [MATERIAL & TEXTURE QUALITY]. [LIGHTING RIG & ATMOSPHERE]. [COMPOSITION & CAMERA]. [POSITIVE EXCLUSION / PURITY STATEMENT]."

### COMPONENTS:

1. **RENDER STYLE & ENGINE** - Define the software look
   - "Rendered in Octane for a hyper-realistic cinematic look"
   - "A stylized 3D character design reminiscent of modern Disney/Pixar animation"
   - "A high-fidelity Unreal Engine 5 real-time render"
   - "A claymation style render with fingerprint textures mimics stop-motion"

2. **MATERIAL & TEXTURE** - Describe surfaces using 3D terminology
   - "Featuring PBR materials with detailed subsurface scattering (SSS) on the skin"
   - "Surfaces are smooth, matte, and colorful with soft gradients"
   - "Worn metal textures with realistic scratches and imperfection maps"

3. **LIGHTING RIG** - Describe virtual lights by their quality
   - "Lit by a classic 3-point lighting setup with a strong rim light creating separation"
   - "Illuminated by global illumination and soft HDRI environment lighting"

4. **POSITIVE EXCLUSION** - Ensure the render is clean
   - "The render is fully converged and noise-free, showcasing a final production-quality asset"
   - "The mesh topology is smooth and clean, with high-poly subdivision for perfect curves"
   - "Presented against a seamless, solid studio backdrop for clear silhouette readability"

### GLOBAL_STYLE_ANCHOR EXAMPLES

**Example 1: Pixar Style**
"Create a 3D render of the character in this image with a stylized Disney/Pixar animation aesthetic. Rendered in a modern animation pipeline with smooth, appealing character proportions and expressive features. The materials feature soft, matte skin with subtle subsurface scattering and vibrant, saturated colors. The lighting creates a warm, inviting atmosphere with soft key illumination and gentle fill, producing smooth shadows and appealing highlights. The render is production-quality with anti-aliased edges, clean topology, and polished presentation against a simple gradient backdrop."

**Example 2: Cyberpunk Octane**
"Create a 3D render of the character in this image with a hyper-realistic cyberpunk aesthetic rendered in Octane. The materials feature detailed PBR textures with metallic surfaces, holographic overlays, and realistic skin with visible pores and subsurface scattering. The lighting creates a dramatic atmosphere with neon rim lights in cyan and magenta, volumetric fog, and strong contrast between shadows and highlights. The render is noise-free and fully converged, showcasing cinema-quality production values against an atmospheric urban backdrop with bokeh city lights."

---

## SCENE PROMPTS - INSTRUCTIONS

### PURPOSE
Each scene defines WHAT the 3D character is doing (Pose, Action, Camera Angle). Scenes are continuations of the global anchor.

### RULE: Start with lowercase "in a..."

### FORMULA
"in a [CAMERA ANGLE/FRAMING]. [POSE & ACTION]. [EXPRESSION]. [OUTFIT/SKIN]. [ENVIRONMENT/PLATFORM]. [POSITIVE EXCLUSION / ASSET CLARITY]."

### THE POSITIVE EXCLUSION STRATEGY FOR SCENES

Instead of using negative prompts, use phrases that enforce the desired outcome:

- To ensure face visibility: "...framed to showcase the character's face with crystal-clear detail and sharp focus."
- To prevent back-turned poses: "...with the character facing the camera, ensuring full facial visibility."
- To ensure quality: "...rendered as a pristine, hero-quality asset with clean geometry and polished presentation."

### COMPONENTS:

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
   - "Placed within a clean studio environment"

5. **SCENE-SPECIFIC POSITIVE EXCLUSION**
   - "The render focuses strictly on the character geometry, ensuring a clean silhouette against the background"
   - "Captured in an anatomically correct pose with natural weight distribution"
   - "Framing the character as the sole hero asset in the center of the composition"

### SCENE PROMPT EXAMPLES

**Scene Example 1 (Portrait):**
"in a close-up portrait shot captured from eye level. The character's face is prominently featured with a confident, determined expression. Wearing futuristic headphones with LED accents and a high-collar tech jacket. The background is a soft gradient that complements the character's color palette. The render showcases exceptional facial detail with sharp focus on the eyes and subtle rim lighting separating the character from the background."

**Scene Example 2 (Full Body Action):**
"in a dynamic full body shot captured from a low angle hero perspective. The character is caught mid-motion in a powerful stance, weight shifted forward with arms positioned for action. Expression is intense and focused. Wearing full tactical armor with glowing energy cores and weathered battle damage. Standing on a floating platform with energy effects beneath. The composition frames the character as an imposing hero figure, filling the frame with commanding presence."

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
8. **Use POSITIVE EXCLUSION** - Never use "Negative prompt:" - enforce quality through positive descriptions
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
