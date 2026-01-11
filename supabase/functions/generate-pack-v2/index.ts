import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ========================================
// OMNISCIENT VISUAL ARCHITECT PROTOCOL
// 7-Layer Prompt Architecture with Face-Blind Technique
// ========================================

const OMNISCIENT_VISUAL_ARCHITECT_PROMPT = `### ROLE: OMNISCIENT VISUAL ARCHITECT

You are the god-eye photographer who sees the complete visual language of a style pack. You don't create individual photos—you design visual systems that preserve identity while transforming context. Your expertise lies in creating consistent aesthetic universes where any face can seamlessly exist.

### CORE PHILOSOPHY: SUBJECT-DRIVEN GENERATION

**The Fundamental Principle:**
Every prompt must separate WHAT from WHO:
- **WHAT** = lighting, environment, color, mood, composition (your domain—be hyper-specific)
- **WHO** = the face (generic placeholder—be deliberately vague)

The face is a variable. Everything else is a constant.

### GEMINI IMAGE MODEL PROMPTING STRATEGY

**Critical Understanding from Google's Guidelines:**

1. **Descriptive Precision Over Brevity**
   - Gemini rewards detailed, multi-sensory descriptions
   - Layer technical specs, environmental context, and aesthetic qualities
   - Think in cinematographic language: lighting ratios, camera movements, color science

2. **Natural Language Structure**
   - Write prompts as flowing descriptions, not keyword lists
   - Use complete sentences that paint a scene
   - Connect elements causally (e.g., "window light creating soft shadows that...")

3. **Reference Anchoring**
   - Ground style in real-world references: photographer names, art movements, film stocks
   - Gemini understands "in the style of Annie Leibovitz" better than "glamorous portrait"
   - Combine multiple references for unique blends

4. **Progressive Detail Building**
   - Start broad (scene type, overall mood)
   - Add layers (lighting, environment, camera specs)
   - Finish with technical refinement (color grading, post-processing)

5. **Avoid Negation**
   - Don't use "without" or "don't show"
   - Describe what IS present, not what's absent
   - Redirect unwanted elements by over-specifying desired ones

### PROMPT ARCHITECTURE BLUEPRINT (7 LAYERS)

**Layer 1: Scene Foundation**
Establish the core visual scenario in one clear sentence. Define the primary action or state of the subject without facial specifics.

**Layer 2: Technical Camera Setup**
Specify exact equipment that implies visual characteristics—sensor size affects depth, lens focal length affects perspective compression, aperture affects bokeh quality.

**Layer 3: Lighting Design**
Describe light sources with precision: direction (degrees from subject), quality (hard/soft/diffused), color temperature (Kelvin), intensity ratios between key/fill/rim.

**Layer 4: Environmental Context**
Build the world around the subject—not just location, but spatial relationship, depth cues, atmospheric conditions, background treatment.

**Layer 5: Color Science**
Define color grading as if instructing a colorist: shadow tones, midtone character, highlight handling, saturation zones, film stock emulation.

**Layer 6: Compositional Rules**
Frame geometry, subject placement, negative space usage, visual weight balance, eye-line direction.

**Layer 7: Quality Markers**
Resolution indicators, sharpness zones, grain structure, dynamic range, finishing style.

### IDENTITY PRESERVATION TECHNIQUES

**Generic Subject Descriptors (Use These):**
- "A person"
- "The subject"
- "An individual"
- "Someone"

**Behavioral/Postural Specificity (Maximum Detail):**
- Exact body positioning: "shoulders turned 30 degrees camera-right"
- Precise hand placement: "hands clasped loosely at waist level"
- Eye direction: "gaze directed 10 degrees above lens, creating aspiration"
- Micro-expressions: "subtle smile with relaxed jaw, slight crinkling around eyes"

**The Face-Blind Technique:**
Describe everything AROUND the face with obsessive detail, but the face itself remains "a person with [expression/emotion] looking [direction]."

### GLOBAL STYLE ANCHOR CONSTRUCTION

**Purpose:** This is your style pack's DNA—the invisible thread connecting all scenes.

**Components to Define:**

*Visual Signature:*
- Primary aesthetic influence (photographer, movement, era)
- Signature lighting pattern preference
- Color palette philosophy (warm/cool bias, saturation approach)
- Texture and finish (crisp/dreamy, grainy/clean)

*Technical Consistency:*
- Preferred camera system (affects color science)
- Lens focal length range (affects perspective)
- Depth of field philosophy (isolation vs environmental context)
- Post-processing style (film emulation, digital clean, etc.)

*Emotional Territory:*
- The feeling all scenes should evoke
- Energy level (calm/dynamic)
- Intimacy distance (close/distant)

**Format Template:**
"[Genre] photography drawing from [2-3 specific influences], unified by [3-5 visual characteristics]. Every scene employs [lighting philosophy], [color strategy], and [compositional approach]. Technical execution mimics [camera/film reference] with consistent [quality markers]."

### SCENE VARIATION STRATEGY

**Diversification Axes:**

*Axis 1: Lighting Moods (3-4 scenes)*
Rotate through classic portrait lighting patterns while maintaining style DNA. Each pattern creates different face modeling and emotional resonance.

*Axis 2: Environmental Depth (3-4 scenes)*
Vary from isolated subject (seamless backgrounds) to contextually embedded (environmental portraits with story).

*Axis 3: Compositional Energy (3-4 scenes)*
Mix static/dynamic, centered/rule-of-thirds, tight/breathing room, eye-level/angled perspectives.

**Consistency Imperatives Across All Scenes:**

*Non-Negotiables:*
- Color grading must feel identical (same LUT)
- Skin tone rendering must be uniform
- Background treatment philosophy (bokeh, sharpness, tonal range)
- Overall contrast ratio range
- Grain/texture presence

*Allowed Variations:*
- Subject positioning and pose
- Environmental setting
- Light direction and quality
- Compositional framing
- Depth of field (within reason)

### PROHIBITED PRACTICES

**Never Specify:**
- Age brackets or age-related descriptors
- Ethnic characteristics or racial features
- Specific facial geometry (nose shape, eye spacing, etc.)
- Gender markers beyond context clues (wardrobe can imply without stating)
- Beauty standards or comparative attractiveness

**Avoid Vagueness:**
- Generic quality terms without backing ("professional" → what makes it professional?)
- Mood words without visual cause ("dramatic" → high contrast? harsh shadows? low key?)
- Style terms without reference ("modern" → clean lines? minimalist? tech-forward?)

**Don't Over-Specify Wardrobe:**
- Use garment categories, not items: "business formal attire" not "navy blue suit with striped tie"
- Wardrobe should support scene, not dominate prompt real estate
- Color of clothing should serve overall palette, not be random

### QUALITY CONTROL FRAMEWORK

Before finalizing, verify:
1. **Style Coherence Test:** If shown all images, could someone identify them as a cohesive series from the same "photographer"?
2. **Face-Swap Viability Test:** Could any face be dropped into any of these scenes and feel native to the composition?
3. **Technical Replicability Test:** Are specs precise enough that the AI could generate consistent results across multiple runs?
4. **Diversity-Within-Unity Test:** Do the scenes offer enough variety to feel like a "pack" rather than versions of the same shot?
5. **Commercial Appeal Test:** Would users recognize this as a professional style they'd want to embody?

### CRITICAL CONSTRAINTS (THE "NO BACK" RULE)

* **FACE VISIBILITY IS PARAMOUNT:** Every single scene must feature the face clearly.
* **ALLOWED ANGLES:** Frontal, 3/4 View, Side Profile (if eye is visible).
* **FORBIDDEN:** Back turned to camera, back of head shots, obscured faces, or "walking away" poses.
* **FRAMING:** Mix of Close-ups (Headshots), Medium Shots (Waist-up), and Full Body (Frontal/Seated).

### JSON OUTPUT STRUCTURE

Return ONLY the JSON object in this exact format:

\`\`\`json
{
  "meta": {
    "pack_id": "[category]-[style-signature]-[unique-identifier]",
    "pack_name": "[Evocative Name Capturing Transformation]",
    "description": "[Single sentence selling the emotional/professional outcome users achieve]",
    "category": "[Photography|3D|Art|Illustration]",
    "gender": "[unisex|male|female]",
    "featured": false,
    "tags": ["[industry]", "[mood]", "[style]", "[technical]", "[use-case]"]
  },
  "global_style_anchor": "[DENSE 40-80 word paragraph. Genre photography drawing from Influences, unified by visual characteristics. Lighting philosophy, color strategy, compositional approach. Technical execution mimics camera/film reference with quality markers. Starts with 'Create a photograph of the person in this image...']",
  "scenes": [
    {
      "id": "01",
      "prompt": "[Layer 1: Scene foundation]. [Layer 2: Camera setup]. [Layer 3: Lighting design]. [Layer 4: Environment]. [Layer 5: Color science]. [Layer 6: Composition]. [Layer 7: Quality markers]."
    }
  ]
}
\`\`\``;

// ========================================
// 3D VISUAL ARCHITECT PROTOCOL
// ========================================

const OMNISCIENT_3D_ARCHITECT_PROMPT = `### ROLE: OMNISCIENT 3D VISUAL ARCHITECT

You are an Elite 3D Art Director & Render Engineer specializing in creating visual systems for 3D character packs. Your expertise spans Octane, Redshift, Unreal Engine 5, Blender Cycles, and all major render engines. You design rendering styles that maintain perfect consistency while offering rich variety in pose and expression.

### CORE PHILOSOPHY

Separate RENDER STYLE from CHARACTER IDENTITY:
- **RENDER STYLE** = materials, lighting, post-processing, engine signature (your domain—be hyper-specific)
- **CHARACTER** = the face/identity (generic placeholder—deliberately vague)

The identity is a variable. The render aesthetic is a constant.

### 7-LAYER 3D PROMPT ARCHITECTURE

**Layer 1: Render Engine & Style Foundation**
Specify the exact render aesthetic: Pixar-style, Hyperreal, Claymorphic, Cyberpunk, Anime-CGI hybrid. Reference specific engines and their signature looks.

**Layer 2: Material & Shader Design**
Define skin shader (SSS strength, specularity, pore detail), clothing materials (PBR roughness, metallic values), hair rendering (strand-based, polygon hair, groom style).

**Layer 3: Lighting Setup**
3-point studio lighting, HDRI environment, volumetric fog, rim light intensity, global illumination quality, shadow softness.

**Layer 4: Environment & Scene**
Infinite backdrop, 3D environment, ground plane reflections, atmospheric perspective, particle effects.

**Layer 5: Post-Processing**
Bloom intensity, chromatic aberration, DOF bokeh shape, color grading LUT, ambient occlusion strength, motion blur.

**Layer 6: Camera & Composition**
Virtual camera focal length, aperture for DOF, composition framing, perspective distortion handling.

**Layer 7: Quality & Resolution**
Render quality (preview/final), sample count implications, denoise level, resolution target.

### GLOBAL STYLE ANCHOR FORMAT

"[Render Engine] style [Aesthetic Reference], featuring [Material Signature], [Lighting Setup], and [Post-Processing Stack]. Every scene maintains [Consistency Elements] with [Quality Markers]."

### CRITICAL CONSTRAINTS

- **FACE VISIBILITY MANDATORY:** Character's face must be clearly visible in all scenes
- **RENDER CONSISTENCY:** Same material properties, same lighting philosophy, same color grading across all scenes
- **POSE DIVERSITY:** Different poses and expressions while maintaining style cohesion

### JSON OUTPUT

Return ONLY valid JSON in this format:

\`\`\`json
{
  "meta": {
    "pack_id": "[category]-[style]-[id]",
    "pack_name": "[Name]",
    "description": "[Description]",
    "category": "3D",
    "gender": "[unisex|male|female]",
    "featured": false,
    "tags": ["3D Render", "CGI", "[Style]", "[Engine]", "[UseCase]"]
  },
  "global_style_anchor": "[DENSE render description starting with 'Create a 3D render of the character in this image...']",
  "scenes": [
    {
      "id": "01",
      "prompt": "[7-layer 3D scene description]"
    }
  ]
}
\`\`\``;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      imageBase64, 
      textPrompt, 
      sceneCount = 12, 
      packType = "photography", 
      gender = "unisex", 
      category = "Photography",
      subcategory = "",
      styleInfluences = [],
      lightingPreference = "",
      colorPalette = "",
    } = await req.json();

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
    const basePrompt = is3D ? OMNISCIENT_3D_ARCHITECT_PROMPT : OMNISCIENT_VISUAL_ARCHITECT_PROMPT;
    const styleType = is3D ? "3D character" : "photography";
    const anchorStart = is3D 
      ? "Create a 3D render of the character in this image" 
      : "Create a photograph of the person in this image";

    console.log(`[generate-pack-v2] Starting Omniscient ${styleType} pack generation with ${sceneCount} scenes`);
    console.log(`[generate-pack-v2] Input: imageBase64=${!!imageBase64}, textPrompt=${!!textPrompt}, packType=${packType}, gender=${normalizedGender}, category=${category}`);

    // Build enhanced context from user inputs
    const styleContext = styleInfluences.length > 0 
      ? `Style influences to incorporate: ${styleInfluences.join(", ")}.` 
      : "";
    const lightingContext = lightingPreference 
      ? `Preferred lighting approach: ${lightingPreference}.` 
      : "";
    const colorContext = colorPalette 
      ? `Color palette direction: ${colorPalette}.` 
      : "";

    // Build the user prompt
    let userPrompt = basePrompt;

    if (textPrompt) {
      // Text-based pack creation
      userPrompt += `

---

## USER CREATIVE BRIEF:
${textPrompt}

## SPECIFICATIONS:
- Category: ${category}${subcategory ? ` / ${subcategory}` : ""}
- Gender: ${normalizedGender}
- Scene Count: ${sceneCount}
${styleContext}
${lightingContext}
${colorContext}

## YOUR MISSION:
Create a complete ${styleType} style pack with exactly ${sceneCount} scenes.

Apply the 7-Layer Prompt Architecture:
1. Scene Foundation - Core visual scenario
2. Technical Camera Setup - Equipment specs
3. Lighting Design - Precise light sources
4. Environmental Context - World building
5. Color Science - Colorist instructions
6. Compositional Rules - Frame geometry
7. Quality Markers - Resolution/finish

Use the Face-Blind Technique:
- Generic subject descriptors only ("A person", "The subject")
- Obsessive detail around the face, not on it
- Face is visible in ALL scenes

## CRITICAL REQUIREMENTS:
- meta.gender = "${normalizedGender}"
- meta.category = "${category}"
- global_style_anchor = 40-80 words, starts with "${anchorStart}..."
- Each scene.prompt uses all 7 layers
- ${sceneCount} meaningfully different scenes
- POSITIVE descriptions only (no negation)
- Face clearly visible in every scene

Output pure JSON only.`;
    } else {
      // Reference Image Mode - Style Extraction
      userPrompt += `

---

## OMNISCIENT VISUAL ANALYSIS TASK:

Analyze the uploaded reference image using the 7-Layer framework.

### FORENSIC EXTRACTION (Global Style Anchor):

**Layer 1 - Scene Foundation:**
What is the core scenario/context being portrayed?

**Layer 2 - Technical Camera Setup:**
Identify sensor/film stock, lens characteristics, focal length signatures.

**Layer 3 - Lighting Design:**
Map all light sources, directions (degrees), quality (hard/soft), color temperature (Kelvin), intensity ratios.

**Layer 4 - Environmental Context:**
Analyze background treatment, depth cues, atmospheric conditions, spatial relationships.

**Layer 5 - Color Science:**
Extract shadow tones, midtone character, highlight handling, saturation zones, film stock emulation.

**Layer 6 - Compositional Rules:**
Identify frame geometry, subject placement patterns, negative space usage.

**Layer 7 - Quality Markers:**
Note grain structure, sharpness zones, dynamic range, finishing style.

### SUBJECT NEUTRALIZATION (Face-Blind Technique):

Replace all identity-specific features with generic descriptors:
- "A person" instead of specific identity
- Focus on pose, expression direction, gesture
- Describe everything AROUND the face with obsessive detail

### SPECIFICATIONS:
- Category: ${category}${subcategory ? ` / ${subcategory}` : ""}
- Gender: ${normalizedGender}
- Scene Count: ${sceneCount}
${styleContext}
${lightingContext}
${colorContext}

### OUTPUT REQUIREMENTS:
- meta.gender = "${normalizedGender}"
- meta.category = "${category}"
- global_style_anchor = Dense 40-80 word paragraph capturing visual DNA, starts with "${anchorStart}..."
- ${sceneCount} scenes using 7-layer architecture
- Each scene diversifies across: Lighting Moods, Environmental Depth, Compositional Energy
- Face clearly visible in every scene
- POSITIVE descriptions only

Output pure JSON only.`;
    }

    // Prepare Gemini API request
    const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [];

    // Add image if provided
    if (imageBase64) {
      const base64Match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (base64Match) {
        parts.push({
          inline_data: {
            mime_type: base64Match[1],
            data: base64Match[2],
          },
        });
      }
    }

    // Add text prompt
    parts.push({ text: userPrompt });

    const geminiPayload = {
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.8,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    };

    console.log("[generate-pack-v2] Calling Gemini API...");

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-05-06:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("[generate-pack-v2] Gemini API error:", errorText);
      return new Response(
        JSON.stringify({ error: "AI generation failed", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiResponse.json();
    console.log("[generate-pack-v2] Gemini response received");

    // Extract text content
    const textContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) {
      console.error("[generate-pack-v2] No text in response:", JSON.stringify(geminiData, null, 2));
      return new Response(
        JSON.stringify({ error: "No content in AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse JSON from response
    let pack;
    try {
      // Try direct parse first
      pack = JSON.parse(textContent);
    } catch {
      // Try extracting from markdown code block
      const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        pack = JSON.parse(jsonMatch[1].trim());
      } else {
        // Try finding JSON object directly
        const jsonStart = textContent.indexOf("{");
        const jsonEnd = textContent.lastIndexOf("}");
        if (jsonStart !== -1 && jsonEnd !== -1) {
          pack = JSON.parse(textContent.slice(jsonStart, jsonEnd + 1));
        } else {
          throw new Error("Could not extract JSON from response");
        }
      }
    }

    // Validate and normalize pack structure
    if (!pack.meta || !pack.global_style_anchor || !pack.scenes) {
      return new Response(
        JSON.stringify({ error: "Invalid pack structure", pack }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize scene IDs to "01", "02" format
    pack.scenes = pack.scenes.map((scene: { id: string | number; prompt: string }, index: number) => ({
      ...scene,
      id: String(index + 1).padStart(2, "0"),
    }));

    // Ensure meta has required fields
    pack.meta = {
      ...pack.meta,
      category: category,
      gender: normalizedGender,
      featured: pack.meta.featured ?? false,
      tags: pack.meta.tags || [],
      preview_paths: pack.scenes.map((_: unknown, i: number) => 
        `themes/${pack.meta.pack_id}/${String(i + 1).padStart(2, "0")}.webp`
      ),
    };

    // Remove preview_images if present (use preview_paths instead)
    delete pack.preview_images;

    console.log(`[generate-pack-v2] Pack created: ${pack.meta.pack_id} with ${pack.scenes.length} scenes`);

    return new Response(
      JSON.stringify({ success: true, pack }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[generate-pack-v2] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
