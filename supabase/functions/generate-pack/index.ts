import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ========================================
// PORTRAIT-FOCUSED STYLE REPLICATION PROTOCOL
// "Elite Visual Director for High-End Portraits"
// ========================================

const PHOTOGRAPHY_PROMPT = `### ROLE

You are an Elite Visual Director specializing in **"Portrait-Focused Style Replication."** Your task is to analyze a reference image and generate a JSON Style Pack that creates high-end, consistent portraits where the subject is always the clear focus.

### OBJECTIVE

Create a JSON output where the "Global Style Anchor" locks the technical aesthetic, and the "Scenes" provide rich variety in expression and lighting, **STRICTLY avoiding back-facing poses.**

### PHASE 1: THE HARD CONSTRAINTS (GLOBAL ANCHOR)

Analyze and lock these elements into the \`global_style_anchor\`:

1.  **The Medium:** Sensor/Film stock, grain structure, color grading (LUT), lens character.

2.  **The Art Direction:** Wardrobe materials, background environment, makeup style.

3.  **The Base Lighting:** The *quality* and *temperature* of light.

### PHASE 2: THE SOFT VARIATIONS (SCENE DYNAMICS)

For the \`scenes\` array, act as a **Performance Coach**. You must describe:

1.  **Facial Expression & Mood:** Specify exact emotions (e.g., "arrogant smirk," "vulnerable gaze," "bursting laughter").

2.  **Lighting Interaction:** Describe how the light hits the facial features in that specific pose (e.g., "butterfly lighting on the nose," "rembrandt triangle on cheek").

3.  **Hand/Body Engagement:** Hands framing the face, playing with hair, or resting on chin to direct focus to the eyes.

### PHASE 3: CRITICAL CONSTRAINTS (THE "NO BACK" RULE)

* **FACE VISIBILITY IS PARAMOUNT:** Every single scene must feature the face clearly.

* **ALLOWED ANGLES:** Frontal, 3/4 View, Side Profile (if eye is visible).

* **FORBIDDEN:** Back turned to camera, back of head shots, obscured faces, or "walking away" poses.

* **FRAMING:** Mix of Close-ups (Headshots), Medium Shots (Waist-up), and Full Body (Frontal/Seated).

### NAMING CONVENTION

* **pack_name:** Creative Title Case.

* **pack_id:** Exact snake_case match.

### JSON OUTPUT TEMPLATE

Return ONLY the JSON object.

\`\`\`json
{
  "meta": {
    "pack_id": "[insert_snake_case_id]",
    "pack_name": "[Insert Title Case Name]",
    "description": "[Summary of aesthetic + mood]",
    "category": "Photography",
    "gender": "unisex",
    "featured": true,
    "tags": ["[Tag1]", "[Tag2]", "[Tag3]", "[Tag4]", "[Tag5]"]
  },
  "preview_images": [
    "themes/[insert_snake_case_id]/01.webp",
    "themes/[insert_snake_case_id]/02.webp",
    ...
  ],
  "global_style_anchor": "[MASTER TECHNICAL PROMPT: Camera + Lens + Film Stock + Color Palette + Wardrobe Texture + Background. NO specific poses here. Starts with 'Create a photograph of the person in this image...']",
  "scenes": [
    {
      "id": "01",
      "prompt": "in a [Framing: Close-up] + [Action: Hands holding lapels] + [Expression: Intense eye contact] + [Light: Catchlights in eyes]. The subject faces the camera directly."
    },
    {
      "id": "02",
      "prompt": "in a [Framing: Medium Shot] + [Action: Leaning forward on knees] + [Expression: Soft smile] + [Light: Soft fall-off on the side of the face]. 3/4 angle view."
    }
  ]
}
\`\`\``;

// ========================================
// 3D ART DIRECTOR & RENDER ENGINEER PROMPT
// ========================================

// ========================================
// DENSE ANCHOR PROTOCOL - PHOTO
// "Technical Prompt Architect & Visual Engineer"
// ========================================

const PHOTO_DENSE_PROMPT = `### ROLE

You are a **Technical Prompt Architect & Visual Engineer**.

Your goal is to eliminate "randomness" in AI image generation. You do this by creating a "Style Pack" where the \`global_style_anchor\` is extremely dense and descriptive, leaving no room for the AI model to hallucinate or guess.

### THE PROBLEM

If the Global Anchor is too short (e.g., "A studio photo of a woman"), the AI will randomly invent lighting, textures, and colors for each scene. This breaks consistency.

### THE SOLUTION: "DENSE ANCHOR PROTOCOL"

1.  **Analyze Everything Static:** Look at the reference image. Describe everything that DOES NOT CHANGE between shots.

    * *Texture:* Grain, sharpness, haze, glow.

    * *Lighting:* Hard/soft, direction, temperature, contrast ratio.

    * *Colors:* Specific hex codes/palette description, saturation levels.

    * *Medium:* Camera model, film stock (Portra/Kodak/Ilford), vintage/digital sensor.

    * *Art Direction:* Makeup style, skin finish (matte/glossy), wardrobe fabric, background material.

2.  **The Formula:** \`[Global Style Anchor]\` + \`[Scene Prompt]\` must equal a complete, grammatically correct image description.

    * *Anchor ends with:* "...capturing a scene where" or similar connector.

    * *Scene starts with:* The subject's action and camera angle.

### PHASE 1: CONSTRUCTING THE "HEAVY" ANCHOR

Your \`global_style_anchor\` must be a paragraph of at least 40-60 words containing:

* **Photography Style:** (e.g., "High-end editorial flash photography")

* **Technical Specs:** (e.g., "Shot on 35mm Fujifilm Pro 400H, heavy grain")

* **Lighting Setup:** (e.g., "Direct harsh ring light casting sharp shadows")

* **Environment:** (e.g., "Against a mottled hand-painted canvas backdrop")

* **Subject Details:** (e.g., "Glossy skin texture, wet-look hair, minimalist styling")

* **Post-Process:** (e.g., "Slight chromatic aberration, cool blue color grading")

### PHASE 2: SCENE GENERATION (VIBE-BASED ANGLES)

Use the **Angle Menu** to select diverse camera angles fitting the vibe, but DO NOT repeat technical style details in the scenes (it's already in the anchor).

* **Menu:** Extreme Close-Up, Low Angle, High Angle, Dutch Tilt, Wide Angle (24mm), Telephoto (85mm), Silhouette, Negative Space.

* **Constraint:** Face must be visible. No back-turned poses.

### NAMING CONVENTION

* **pack_name:** Creative Title Case.

* **pack_id:** Exact snake_case match.

### JSON OUTPUT TEMPLATE

Return ONLY the JSON object.

\`\`\`json
{
  "meta": {
    "pack_id": "[insert_snake_case_id]",
    "pack_name": "[Insert Title Case Name]",
    "description": "[Description of the dense style and mood]",
    "category": "Photography",
    "gender": "unisex",
    "featured": true,
    "tags": ["[DetailedTag1]", "[DetailedTag2]", "[DetailedTag3]", "[DetailedTag4]", "[DetailedTag5]"]
  },
  "preview_images": [
    "themes/[insert_snake_case_id]/01.webp",
    "themes/[insert_snake_case_id]/02.webp",
    ...
  ],
  "global_style_anchor": "[INSERT DENSE DESCRIPTION HERE. Example: 'A raw, hyper-realistic fashion portrait shot on 35mm Kodak Portra 800 film. The lighting is harsh and direct, creating a hard-flash aesthetic with strong contrast. The background is a seamless cream paper backdrop. The subject features ultra-detailed skin texture with visible pores and imperfections, styled in a Y2K aesthetic with glossy lips. The color grading leans towards warm yellows and desaturated cyans. The image quality has a vintage analog feel with soft edges and halation, capturing a scene where...']",
  "scenes": [
    {
      "id": "01",
      "prompt": "a low-angle hero shot of the model standing confidently, hands resting on hips, looking down at the lens with an arrogant expression."
    },
    {
      "id": "02",
      "prompt": "an extreme close-up of the model's face, focusing on the eyes and makeup texture, with lips slightly parted in a soft expression."
    },
    {
      "id": "03",
      "prompt": "a wide-angle 24mm shot creating a dynamic distortion, where the model is reaching towards the camera, fingers blurred in the foreground."
    },
    {
      "id": "04",
      "prompt": "a high-angle bird's eye view of the model sitting on the floor, looking up with a vulnerable gaze, knees pulled towards the chest."
    },
    {
      "id": "05",
      "prompt": "a dutch tilt composition adding unease, with the model leaning against a prop, hair falling across the face, looking directly into the flash."
    },
    {
      "id": "06",
      "prompt": "a through-the-object shot, framing the model's face through a foreground element (like glass or fabric), creating a voyeuristic feel."
    },
    {
      "id": "07",
      "prompt": "a motion-blur shot capturing the model spinning or whipping hair, face remaining relatively sharp while the edges streak."
    },
    {
      "id": "08",
      "prompt": "a profile silhouette shot where the rim light catches the jawline and nose, emphasizing the geometry of the face."
    },
    {
      "id": "09",
      "prompt": "a negative space composition where the model is positioned in the bottom right corner, looking into the empty space."
    },
    {
      "id": "10",
      "prompt": "a symmetrical front-facing portrait, eyes dead-center in the frame, with a neutral and intense expression."
    },
    {
      "id": "11",
      "prompt": "a playful candid moment, model laughing with hand covering mouth, captured with a slightly out-of-focus snapshot aesthetic."
    },
    {
      "id": "12",
      "prompt": "a telephoto compressed shot (85mm), isolating the model from the background completely, focusing on the emotion in the eyes."
    }
  ]
}
\`\`\``;

const THREE_D_PROMPT = `### ROLE

You are an Elite **3D Art Director & Render Engineer** (specializing in Octane, Redshift, and Unreal Engine aesthetics). Your task is to reverse-engineer a reference image into a JSON Style Pack that replicates the specific **3D Rendering Style, Materiality, and Lighting Setup**, while keeping the subject adaptable.

### OBJECTIVE

Create a JSON output where the "Global Style Anchor" locks the Render Engine's signature look (e.g., Claymorphism, Hyper-realism, Cyberpunk, Pixar-style), and the "Scenes" provide high-quality character poses with perfect face visibility.

### PHASE 1: THE HARD CONSTRAINTS (GLOBAL ANCHOR)

Analyze and lock these **3D specific elements** into the \`global_style_anchor\`:

1.  **Render Aesthetic:** Is it Stylized (Pixar/Fortnite), Hyper-realistic (Metahuman), Clay/Plastic, or Surreal? Mention the specific engine vibe (e.g., "Unreal Engine 5 Lumen," "Octane Render path tracing").

2.  **Materiality & Textures:** Define the skin shader (e.g., "waxy subsurface scattering," "glossy plastic," "porous realistic skin"). Define clothing materials (e.g., "digital fabric," "latex," "metallic mesh").

3.  **Lighting & Atmosphere:** Define the light setup (e.g., "HDRI Studio Lighting," "Volumetric Fog," "Rim Light dominance," "Global Illumination").

4.  **Post-Processing:** Mention 3D effects like "Bloom," "Chromatic Aberration," "Depth of Field (Bokeh)," or "Ambient Occlusion."

### PHASE 2: THE SOFT VARIATIONS (SCENE DYNAMICS)

For the \`scenes\` array, describe the character's acting within a 3D space:

1.  **Pose & Silhouette:** Describe dynamic poses that showcase the 3D geometry and silhouette clarity.

2.  **Lighting Interaction:** Describe how the virtual lights interact with the materials in that specific pose (e.g., "Rim light catching the edge of the hair," "Subsurface scattering glowing on the ears").

3.  **Expression:** exaggerated or subtle expressions suitable for the specific 3D style.

### PHASE 3: CRITICAL CONSTRAINTS (NO BACK FACING)

* **FACE VISIBILITY IS MANDATORY:** The render must clearly show the character's face.

* **CAMERA ANGLES:** Front, 3/4 Perspective, Side Profile.

* **FORBIDDEN:** Back of head, walking away, obscured faces.

* **COMPOSITION:** Must look like a finished high-end render, not a viewport screenshot.

### NAMING CONVENTION

* **pack_name:** Creative Title Case (e.g., "Neon Plastic Dreams").

* **pack_id:** Exact snake_case match (e.g., "neon_plastic_dreams").

### JSON OUTPUT TEMPLATE

Return ONLY the JSON object.

\`\`\`json
{
  "meta": {
    "pack_id": "[insert_snake_case_id]",
    "pack_name": "[Insert Title Case Name]",
    "description": "[Summary of the 3D style, render engine vibe, and material mood]",
    "category": "3D Render / CGI",
    "gender": "unisex",
    "featured": true,
    "tags": ["3D Render", "CGI", "[RenderStyle]", "[MaterialType]"]
  },
  "preview_images": [
    "themes/[insert_snake_case_id]/01.webp",
    "themes/[insert_snake_case_id]/02.webp",
    ...
  ],
  "global_style_anchor": "[MASTER 3D PROMPT: Render Engine Name + Material Description (SSS, Gloss) + Lighting Setup (HDRI, Rim) + Background (Solid Color, 3D Environment). Starts with 'Create a 3D render of the character in this image...'. NO specific poses here.]",
  "scenes": [
    {
      "id": "01",
      "prompt": "in a [Framing: Close-up] + [Action: Looking at camera] + [Expression: Confident smile] + [3D Detail: Soft studio lighting reflecting in eyes]. Character faces forward."
    },
    {
      "id": "02",
      "prompt": "in a [Framing: Medium Shot] + [Action: Crossing arms] + [Expression: Serious] + [3D Detail: Rim light highlighting the shoulder silhouette]. 3/4 view."
    },
    {
      "id": "03",
      "prompt": "in a [Framing: Full Body] + [Action: Floating/Jumping pose] + [Expression: Energetic] + [3D Detail: Dynamic cloth simulation freezing in air]. Frontal view."
    }
  ]
}
\`\`\``;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, textPrompt, sceneCount = 12, packType = "photography", gender = "unisex", category = "Photography" } = await req.json();

    if (!imageBase64 && !textPrompt) {
      return new Response(
        JSON.stringify({ error: "Image or text prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate gender value
    const validGenders = ["male", "female", "unisex"];
    const normalizedGender = validGenders.includes(gender) ? gender : "unisex";

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const is3D = packType === "3d";
    const isPhotoDense = packType === "photo";
    const basePrompt = is3D ? THREE_D_PROMPT : (isPhotoDense ? PHOTO_DENSE_PROMPT : PHOTOGRAPHY_PROMPT);
    const styleType = is3D ? "3D character" : (isPhotoDense ? "dense photo" : "photography");
    const anchorStart = is3D 
      ? "Create a 3D render of the character in this image" 
      : "Create a photograph of the person in this image";

    console.log(`[generate-pack] Starting ${styleType} pack generation with ${sceneCount} scenes, gender=${normalizedGender}, category=${category}...`);
    console.log(`[generate-pack] Input: imageBase64=${!!imageBase64}, textPrompt=${!!textPrompt}, packType=${packType}, gender=${normalizedGender}, category=${category}`);
    console.log(`[generate-pack] Using Google Gemini API with gemini-3-pro-preview model`);

    // Build gender and category specific instruction
    const categoryInstruction = `The pack category MUST be set to "${category}" in meta.category field.`;
    const genderInstruction = normalizedGender === "unisex" 
      ? "The pack should be gender-neutral and suitable for any person."
      : `The pack is specifically designed for ${normalizedGender} subjects. Set meta.gender to "${normalizedGender}" and ensure all wardrobe, poses, and styling descriptions are appropriate for ${normalizedGender} subjects.`;

    // Build the user prompt
    let userPrompt = basePrompt;

    if (textPrompt) {
      // Text-based pack creation
      userPrompt += `

---

## USER REQUEST:
${textPrompt}

## GENDER SPECIFICATION:
${genderInstruction}

## CATEGORY SPECIFICATION:
${categoryInstruction}

## YOUR TASK:
Create a complete ${styleType} style pack with exactly ${sceneCount} scenes based on this description.

Apply the Portrait-Focused Style Replication Protocol:
- global_style_anchor locks: Camera/Film stock, grain, color grading, wardrobe materials, background, base lighting
- Each scene has: Facial Expression & Mood, Lighting Interaction, Hand/Body Engagement
- Face must be CLEARLY VISIBLE in ALL scenes
- Mix of Close-ups, Medium Shots, and Full Body (Frontal/Seated)
- NO back-turned poses, NO obscured faces

## CRITICAL REMINDERS:
- meta.gender MUST be set to "${normalizedGender}"
- meta.category MUST be set to "${category}"
- global_style_anchor starts with "${anchorStart}..."
- Each scene prompt starts with lowercase "in a..." as continuation
- ${sceneCount} meaningfully different scenes
- Use POSITIVE descriptions only

Output pure JSON only.`;
    } else {
      // Reference Image Mode - Style Extraction
      userPrompt += `

---

## FORENSIC STYLE CLONING TASK:

Analyze the uploaded reference image and perform **Portrait-Focused Style Replication**.

### PHASE 1: FORENSIC STYLE EXTRACTION (Global Style Anchor)

Extract and lock these elements:

**THE MEDIUM:**
- Identify sensor/film stock (35mm grain, medium format, digital)
- Analyze lens character (focal length, bokeh shape, aberrations)
- Determine color grading (warm highlights, cool shadows, LUT style)

**THE ART DIRECTION:**
- Wardrobe materials and textures
- Background environment style
- Makeup and grooming aesthetic

**THE BASE LIGHTING:**
- Light quality (hard/soft)
- Light temperature (warm/cool)
- Lighting pattern (Rembrandt, butterfly, split, rim)

**SUBJECT NEUTRALIZATION (CRITICAL):**
- HARD RULE: Use "the person in this image" ONLY
- NO description of subject's hair color, eye color, race, gender, age
- Any physical description is a CRITICAL FAILURE

### PHASE 2: SCENE GENERATION (${sceneCount} Scenes)

Create ${sceneCount} scenes as a **Performance Coach**:

**DIVERSITY REQUIREMENTS:**
- ${Math.floor(sceneCount / 3)} Close-ups (Headshots)
- ${Math.floor(sceneCount / 3)} Medium Shots (Waist-up)  
- ${Math.floor(sceneCount / 3)} Full Body (Frontal/Seated)

**EACH SCENE MUST INCLUDE:**
1. **Facial Expression & Mood:** Specific emotions (e.g., "arrogant smirk," "vulnerable gaze," "bursting laughter")
2. **Lighting Interaction:** How light hits facial features (e.g., "butterfly lighting on nose," "rembrandt triangle on cheek")
3. **Hand/Body Engagement:** Hands framing face, playing with hair, resting on chin

**THE "NO BACK" RULE:**
- FACE VISIBILITY IS PARAMOUNT
- ALLOWED: Frontal, 3/4 View, Side Profile (if eye visible)
- FORBIDDEN: Back turned, back of head, obscured faces, walking away poses

## GENDER SPECIFICATION:
${genderInstruction}

## CATEGORY SPECIFICATION:
${categoryInstruction}

## CRITICAL REMINDERS:
- meta.gender MUST be set to "${normalizedGender}"
- meta.category MUST be set to "${category}"
- global_style_anchor is ONE complete technical paragraph starting with "${anchorStart}..."
- Each scene prompt starts with lowercase "in a..." as continuation
- Face must be clearly visible in ALL ${sceneCount} scenes
- NO back-turned poses, NO distant shots, NO obscured faces
- Extract the HOW (camera, lighting, film stock), not the WHO (subject identity)

Output pure JSON only.`;
    }

    // Build messages for Lovable AI Gateway
    const messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [];

    if (imageBase64) {
      // Reference image mode - multimodal
      const imageUrl = imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
      messages.push({
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      });
      console.log("[generate-pack] Added reference image for style extraction");
    } else {
      // Text-only mode
      messages.push({
        role: "user",
        content: userPrompt
      });
    }

    console.log("[generate-pack] Calling Google Gemini API with gemini-2.5-pro-preview-05-06...");

    // Build Gemini API request format
    const geminiParts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [];
    
    if (imageBase64) {
      // Add image first
      const base64Data = imageBase64.startsWith("data:") 
        ? imageBase64.split(",")[1] 
        : imageBase64;
      geminiParts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: base64Data
        }
      });
    }
    
    // Add text prompt
    geminiParts.push({ text: userPrompt });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: geminiParts
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[generate-pack] Google Gemini API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 403) {
        return new Response(
          JSON.stringify({ error: "API key invalid or quota exceeded." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `Gemini API error: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("[generate-pack] Google Gemini API response received");

    // Extract text from Gemini response format
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      console.error("[generate-pack] No text content in response:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "No response from AI" }),
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
    // Photo Dense anchors may start differently (e.g., "A raw, hyper-realistic...")
    if (!isPhotoDense) {
      const expectedStart = is3D ? "create a 3d render" : "create a photograph";
      if (packData.global_style_anchor && !packData.global_style_anchor.toLowerCase().startsWith(expectedStart)) {
        console.log(`[generate-pack] Warning: global_style_anchor doesn't start with '${expectedStart}'`);
      }
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
    // ALWAYS normalize scene IDs to "01", "02" format
    for (let i = 0; i < packData.scenes.length; i++) {
      const scene = packData.scenes[i];
      
      // Normalize scene ID to "01", "02", etc. format (always string with leading zero)
      if (!scene.id) {
        scene.id = String(i + 1).padStart(2, "0");
      } else {
        // Convert any format (1, "1", "01", etc.) to "01" format
        const numericId = typeof scene.id === "string" ? parseInt(scene.id, 10) : scene.id;
        scene.id = String(isNaN(numericId) ? i + 1 : numericId).padStart(2, "0");
      }
      
      if (!scene.prompt) scene.prompt = `Scene ${scene.id}`;
      
      // Validate scene prompt starts with lowercase "in a"
      if (scene.prompt && !scene.prompt.toLowerCase().startsWith("in a")) {
        console.log(`[generate-pack] Warning: Scene ${scene.id} prompt doesn't start with 'in a'`);
      }
    }

    // Ensure meta fields with defaults
    if (!packData.meta.description) packData.meta.description = "";
    if (!packData.meta.category) packData.meta.category = is3D ? "3D" : (isPhotoDense ? "Photo" : "Photography");
    // Force the gender to the user-specified value
    packData.meta.gender = normalizedGender;
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
    console.log("[generate-pack] Gender:", packData.meta.gender);
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
