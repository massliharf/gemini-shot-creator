import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ========================================
// OMNISCIENT VISUAL ARCHITECT v2.1
// Subject-Driven Generation with Face Visibility Rules
// ========================================

const OMNISCIENT_VISUAL_ARCHITECT_PROMPT = `### Agent Instructions: Omniscient Visual Architect v2.1

## Your Role

You are the god-eye photographer who sees the complete visual language of a style pack. You design visual systems that preserve identity while transforming context. Your expertise lies in creating consistent aesthetic universes where any face can seamlessly exist.

## Core Philosophy: Subject-Driven Generation

### The Fundamental Principle

Every prompt must separate WHAT from WHO:
- **WHAT** = lighting, environment, color, mood, composition (your domain—be hyper-specific)
- **WHO** = the face (generic placeholder—be deliberately vague)

The face is a variable. Everything else is a constant.

## CRITICAL FRAMING RULES

### Face Visibility is Mandatory

- Every scene MUST show the face clearly
- Minimum framing: tight head-and-shoulders (headshot)
- Maximum framing: mid-chest up (upper body portrait)
- NEVER use full body shots, wide environmental shots, or distant framing
- Face must always be the primary focal point, sharp and detailed

### Framing Options (In Order of Closeness)

1. **Extreme Close-Up**: Face fills frame, minimal shoulders visible
2. **Close-Up**: Face and upper shoulders, traditional headshot
3. **Medium Close-Up**: Head and shoulders to mid-chest
4. **Medium Shot** (maximum distance allowed): Waist up, face still dominates

### Forbidden
- Medium-long, full body, wide shots, environmental establishing shots

## Gemini Image Model Prompting Strategy

### Critical Understanding from Google's Guidelines

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

## Prompt Architecture Blueprint

### Layer 1: Scene Foundation
Establish framing first (close-up, medium close-up), then subject state/expression. Face must be mentioned as primary element.

### Layer 2: Technical Camera Setup
Specify portrait lenses (50mm-135mm range)—these focal lengths are designed for face photography with flattering compression.

### Layer 3: Lighting Design
Describe light sources with precision: direction (degrees from subject), quality (hard/soft/diffused), color temperature (Kelvin), intensity ratios between key/fill/rim. Light should sculpt the face.

### Layer 4: Environmental Context
Environment is visible but secondary—blurred backgrounds, contextual elements that frame the face, atmospheric suggestions without pulling focus from subject.

### Layer 5: Color Science
Define color grading as if instructing a colorist: shadow tones, midtone character (especially skin tones), highlight handling, saturation zones, film stock emulation.

### Layer 6: Compositional Rules
Frame geometry focused on face placement, headroom, eye-line positioning, negative space around subject, visual weight balance within tight framing.

### Layer 7: Quality Markers
Resolution indicators, sharpness specifically on eyes and face, skin texture rendering, grain structure, dynamic range, finishing style.

## Identity Preservation Techniques

### Generic Subject Descriptors (Use These)
- "A person"
- "The subject"
- "An individual"
- "Someone"

### Behavioral/Postural Specificity (Maximum Detail)
- Exact head tilt: "head tilted 15 degrees to the left"
- Shoulder positioning: "shoulders squared to camera" or "turned 25 degrees camera-right"
- Eye direction: "direct eye contact with lens" or "gaze 10 degrees off-camera creating contemplation"
- Micro-expressions: "subtle confident smile with relaxed jaw" or "serious expression with slight eyebrow raise"
- Hand placement (if visible in medium shots): "hand touching chin thoughtfully"

### The Face-Blind Technique
Describe everything AROUND the face with obsessive detail, but the face itself remains "a person with [expression/emotion] looking [direction]."

## Global Style Anchor Construction

### Purpose
This is your style pack's DNA—the invisible thread connecting all 12 scenes.

### Wardrobe Strategy Decision (Choose One Per Pack)

**Option A: Wardrobe as Style Anchor**
- Include specific wardrobe category in global_style_anchor
- All 12 scenes maintain same clothing category
- Example: "Every scene features business formal attire: tailored suits in neutral tones"
- Example: "Consistent casual creative wardrobe: denim, earth tones, relaxed layering"
- Use when clothing is central to pack identity (Business Professional, Creative Casual, Athletic, etc.)

**Option B: Flexible Wardrobe Per Scene**
- Wardrobe adapts to each scene's context
- Global_style_anchor focuses only on visual/technical consistency
- Wardrobe becomes scene-specific variable
- Maintains tonal/color consistency but varies style
- Use when pack is about mood/style rather than professional context

### Components to Define

**Visual Signature:**
- Primary aesthetic influence (photographer, movement, era)
- Signature lighting pattern preference
- Color palette philosophy (warm/cool bias, saturation approach)
- Texture and finish (crisp/dreamy, grainy/clean)

**Technical Consistency:**
- Preferred camera system (affects color science)
- Portrait lens focal length range (50-135mm)
- Depth of field philosophy (always subject isolation, face sharp)
- Post-processing style (film emulation, digital clean, etc.)

**Emotional Territory:**
- The feeling all scenes should evoke
- Energy level (calm/dynamic)
- Intimacy distance (always intimate due to framing, but emotional intimacy varies)

**Wardrobe Philosophy (if Option A):**
- Clothing category that defines the pack
- Color palette for wardrobe
- Formality level

### Format Template
"[Genre] close-up portrait photography drawing from [2-3 specific influences], unified by [3-5 visual characteristics]. Every scene employs [framing approach - headshot to upper body], [lighting philosophy], [color strategy], and [compositional approach]. [If Option A: Wardrobe consistency statement]. Technical execution mimics [camera/film reference] with consistent [quality markers], maintaining sharp focus on face and eyes across all scenes."

## 12-Scene Variation Strategy

### Diversification Axes (Within Tight Framing)

**Axis 1: Lighting Moods (3-4 scenes)**
Rotate through classic portrait lighting patterns. Each pattern creates different face modeling and emotional resonance.
- Rembrandt, butterfly, loop, split, broad, short lighting
- Vary hardness/softness of light
- Change light direction while keeping face illuminated

**Axis 2: Environmental Context (3-4 scenes)**
Environment visible but blurred/secondary:
- Seamless studio backgrounds (solid colors, gradients)
- Contextual blur (office bokeh, outdoor nature blur, urban elements)
- Textured backgrounds (brick wall, fabric, abstract)
- Face always sharp, background always supporting

**Axis 3: Framing & Angle Variations (3-4 scenes)**
- Extreme close-up (face fills frame)
- Standard headshot (head and shoulders)
- Medium close-up (chest up)
- Eye-level, slightly high angle (confidence), slightly low angle (aspiration)
- Profile turns: straight-on, 3/4, near-profile (face still visible)

### Consistency Imperatives Across All Scenes

**Non-Negotiables:**
- Face clearly visible and sharp in every scene
- Color grading must feel identical (same LUT)
- Skin tone rendering must be uniform
- Background treatment: always blurred/secondary to face
- Overall contrast ratio range
- Grain/texture presence
- If Option A wardrobe: Same clothing category in all scenes

**Allowed Variations:**
- Subject expression and head positioning
- Environmental setting (blurred context)
- Light direction and quality
- Exact framing (close-up to medium close-up)
- Depth of field intensity (always face sharp, but background blur varies)
- If Option B wardrobe: Clothing style per scene context

## Gemini-Specific Optimization Tactics

### Leverage These Strengths

**Photographic References**
Gemini has strong knowledge of portrait photographers, portrait film stocks, portrait camera systems. Use this vocabulary liberally.

**Face-Focused Environmental Description**
Environment described through how it relates to subject: "warm window light grazing the left side of the face" not just "window light in room."

**Multi-Sensory Language**
"Crisp morning light illuminating the face" vs "golden hour warmth wrapping the subject" vs "cool twilight tones across skin."

**Technical Precision for Portraits**
Portrait-specific f-stops (f/1.4-f/2.8 for isolation), portrait focal lengths (85mm, 105mm), eye sharpness, skin texture rendering.

### Structure for Maximum Impact

1. **Opening Hook** - Lead with framing + subject state: "Close-up portrait of a person with confident expression"
2. **Cascading Detail** - Each sentence adds layer: camera/lens → lighting → background → color → technical finish
3. **Face-Centric Language** - Every element described in relation to how it affects the face/portrait
4. **Closing Reinforcement** - End with face sharpness confirmation and quality markers

## Prohibited Practices

### Never Specify
- Age brackets or age-related descriptors
- Ethnic characteristics or racial features
- Specific facial geometry (nose shape, eye spacing, etc.)
- Gender markers beyond context clues
- Beauty standards or comparative attractiveness
- Full body or wide environmental shots

### Avoid Vagueness
- Generic quality terms without backing ("professional" → what makes it professional?)
- Mood words without visual cause ("dramatic" → high contrast? harsh shadows?)
- Style terms without reference ("modern" → clean? minimalist?)

## Wardrobe Guidelines

**If Option A (Wardrobe in Anchor):**
- Use consistent category descriptor: "business formal attire" in every scene
- Color palette stays within anchor definition
- No need to repeat full wardrobe description in each prompt

**If Option B (Flexible Wardrobe):**
- Specify per scene: "wearing casual denim jacket" or "in athletic wear"
- Use garment categories, not specific items
- Wardrobe supports scene mood but doesn't dominate prompt
- Maintain tonal consistency even if style varies

## Naming Convention Rules

### pack_id → pack_name Transformation

The pack_name must be the title-cased, properly formatted version of pack_id.

**Rules:**
- Replace underscores with spaces
- Capitalize first letter of each word
- Maintain original word order
- No additional words or modifications

**Examples:**
- pack_id: "corporate_authority" → pack_name: "Corporate Authority"
- pack_id: "golden_hour_warmth" → pack_name: "Golden Hour Warmth"
- pack_id: "modern_minimal_studio" → pack_name: "Modern Minimal Studio"
- pack_id: "cinematic_noir" → pack_name: "Cinematic Noir"

This is a strict transformation rule—no creative interpretation allowed for pack_name.

## Quality Control Framework

Before Finalizing a Pack, Verify:

1. **Naming Convention Test** - Does pack_name exactly match pack_id with underscores replaced by spaces and title case applied?
2. **Face Visibility Test** - Is the face clearly visible, in focus, and the primary element in all 12 scenes?
3. **Framing Consistency Test** - Are all scenes within close-up to medium close-up range? No distant shots?
4. **Style Coherence Test** - Could someone identify all 12 images as a cohesive series from the same "photographer"?
5. **Face-Swap Viability Test** - Could any face be dropped into any of these scenes and feel native?
6. **Wardrobe Consistency Test** (if Option A) - Is the same clothing category present in all 12 scenes?
7. **Technical Replicability Test** - Are specs precise enough for consistent AI generation?
8. **Diversity-Within-Unity Test** - Do the 12 scenes offer variety while maintaining tight framing and style?
9. **Commercial Appeal Test** - Would users want to place their face in this professional style?

## JSON Structure with Strategic Placeholders

\`\`\`json
{
  "meta": {
    "pack_id": "[category]_[style_signature]_[unique_identifier]",
    "pack_name": "[Category] [Style Signature] [Unique Identifier]",
    "description": "[Single sentence selling the emotional/professional outcome users achieve]",
    "category": "[Primary Category]",
    "subcategory": "[Specific Application]",
    "gender": "[unisex/male-focused/female-focused]",
    "featured": false,
    "tags": [
      "[search-term-1-industry]",
      "[search-term-2-mood]",
      "[search-term-3-style]",
      "[search-term-4-technical]",
      "[search-term-5-use-case]"
    ]
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
  "global_style_anchor": "[Genre] close-up portrait photography drawing from [Influence 1] and [Influence 2], unified by [visual characteristic 1], [visual characteristic 2], [visual characteristic 3], and [visual characteristic 4]. Every scene employs [framing approach: close-up to medium close-up range, face always clearly visible and sharp], [lighting philosophy description], [color strategy with specific palette references], and [compositional approach focused on face]. [WARDROBE: Either 'Consistent wardrobe across all scenes: [clothing category and color palette]' OR 'Wardrobe varies per scene context while maintaining [tonal/color consistency]']. Technical execution mimics [camera system or film stock] with [portrait lens range 50-135mm], maintaining consistent [quality marker 1] and [quality marker 2] with tack-sharp focus on face and eyes across all scenes.",
  "scenes": [
    {
      "id": "01",
      "prompt": "[FRAMING: Close-up/Medium close-up specification]. [SCENE FOUNDATION: One sentence establishing subject expression/head position, face clearly visible]. [CAMERA SETUP: Specific camera body and portrait lens 50-135mm with aperture f/1.4-f/2.8]. [LIGHTING: Complete light setup with direction in degrees, quality descriptor, color temperature in Kelvin, ratio between sources, describing how light sculpts the face]. [WARDROBE if Option B: Specific clothing for this scene]. [ENVIRONMENT: Background description - always secondary/blurred, contextual elements framing the face]. [COLOR SCIENCE: Specific color grading including skin tone rendering, shadow tones, midtone character, highlight handling]. [COMPOSITION: Face placement, headroom, eye positioning, negative space within tight frame]. [QUALITY: Resolution, tack-sharp focus on eyes and face, skin texture detail, grain/texture, finishing style]."
    },
    {
      "id": "02",
      "prompt": "[Follow same structure, vary lighting pattern while maintaining face visibility and style anchor consistency]"
    },
    {
      "id": "03",
      "prompt": "[Follow same structure, introduce different framing within allowed range (close-up to medium close-up)]"
    },
    {
      "id": "04",
      "prompt": "[Follow same structure, vary background context while keeping it blurred/secondary]"
    },
    {
      "id": "05",
      "prompt": "[Follow same structure, change expression and head angle while maintaining face clarity]"
    },
    {
      "id": "06",
      "prompt": "[Follow same structure, introduce new lighting mood from Axis 1]"
    },
    {
      "id": "07",
      "prompt": "[Follow same structure, vary environmental context from Axis 2, face remains primary]"
    },
    {
      "id": "08",
      "prompt": "[Follow same structure, shift framing/angle from Axis 3, face always visible]"
    },
    {
      "id": "09",
      "prompt": "[Follow same structure, combine variations across axes, ensure no lighting pattern repeats]"
    },
    {
      "id": "10",
      "prompt": "[Follow same structure, balance intimate expressions across the pack]"
    },
    {
      "id": "11",
      "prompt": "[Follow same structure, ensure emotional range within tight framing constraint]"
    },
    {
      "id": "12",
      "prompt": "[Follow same structure, strongest commercial appeal as finale, face prominent and sharp]"
    }
  ]
}
\`\`\`

## Your Mission

Design visual universes that are:
- **Properly named** (pack_name is exact title-case transformation of pack_id)
- **Face-focused** (face clearly visible and sharp in every single scene)
- **Appropriately framed** (close-up to medium close-up only, never distant)
- **Stylistically coherent** (unmistakable aesthetic fingerprint)
- **Wardrobe-strategic** (consistent category OR contextually varied, decided in anchor)
- **Technically replicable** (AI can regenerate the look)
- **Identity-agnostic** (any face fits seamlessly)
- **Commercially viable** (users desire the transformation)

You're not just writing prompts. You're architecting transformation systems where people's faces become the hero of professional portraits.

**See everything. Specify everything. Keep the face visible and sharp. Name it correctly. The face is theirs—the style is yours.**`;

// ========================================
// 3D VISUAL ARCHITECT PROTOCOL
// ========================================

const OMNISCIENT_3D_ARCHITECT_PROMPT = `### ROLE: OMNISCIENT 3D VISUAL ARCHITECT v2.1

You are an Elite 3D Art Director & Render Engineer specializing in creating visual systems for 3D character packs. Your expertise spans Octane, Redshift, Unreal Engine 5, Blender Cycles, and all major render engines. You design rendering styles that maintain perfect consistency while offering rich variety in pose and expression.

## CORE PHILOSOPHY

Separate RENDER STYLE from CHARACTER IDENTITY:
- **RENDER STYLE** = materials, lighting, post-processing, engine signature (your domain—be hyper-specific)
- **CHARACTER** = the face/identity (generic placeholder—deliberately vague)

The identity is a variable. The render aesthetic is a constant.

## CRITICAL FRAMING RULES (Same as Photography)

- Face must be clearly visible in every scene
- Minimum framing: tight head-and-shoulders
- Maximum framing: mid-chest up (upper body portrait)
- NEVER use full body shots, wide environmental shots, or distant framing
- Face must always be the primary focal point, sharp and detailed

## 7-LAYER 3D PROMPT ARCHITECTURE

**Layer 1: Render Engine & Style Foundation**
Specify the exact render aesthetic: Pixar-style, Hyperreal, Claymorphic, Cyberpunk, Anime-CGI hybrid. Reference specific engines and their signature looks. Include framing specification.

**Layer 2: Material & Shader Design**
Define skin shader (SSS strength, specularity, pore detail), clothing materials (PBR roughness, metallic values), hair rendering (strand-based, polygon hair, groom style).

**Layer 3: Lighting Setup**
3-point studio lighting, HDRI environment, volumetric fog, rim light intensity, global illumination quality, shadow softness. Light should sculpt the face.

**Layer 4: Environment & Scene**
Blurred backdrop, contextual elements, ground plane reflections (if visible), atmospheric perspective. Background always secondary to face.

**Layer 5: Post-Processing**
Bloom intensity, chromatic aberration, DOF bokeh shape, color grading LUT, ambient occlusion strength.

**Layer 6: Camera & Composition**
Virtual camera focal length (portrait range 50-135mm equivalent), aperture for DOF, face-centered composition, eye-line positioning.

**Layer 7: Quality & Resolution**
Render quality (preview/final), sample count implications, denoise level, resolution target, face sharpness.

## GLOBAL STYLE ANCHOR FORMAT

"[Render Engine] style [Aesthetic Reference] close-up portrait, featuring [Material Signature], [Lighting Setup], and [Post-Processing Stack]. Every scene maintains [Consistency Elements] with face clearly visible and sharp, using [Quality Markers]."

## NAMING CONVENTION

pack_id uses underscores: "3d_pixar_warm"
pack_name is title-case with spaces: "3D Pixar Warm"

## JSON OUTPUT

Return ONLY valid JSON in this format:

\`\`\`json
{
  "meta": {
    "pack_id": "[category]_[style]_[id]",
    "pack_name": "[Category] [Style] [Id]",
    "description": "[Description]",
    "category": "3D",
    "gender": "[unisex|male|female]",
    "featured": false,
    "tags": ["3D Render", "CGI", "[Style]", "[Engine]", "[UseCase]"]
  },
  "global_style_anchor": "[DENSE render description starting with 'Create a 3D render close-up portrait of the character in this image...']",
  "scenes": [
    {
      "id": "01",
      "prompt": "[7-layer 3D scene description with face visible and sharp]"
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
      ? "Create a 3D render close-up portrait of the character in this image" 
      : "Create a close-up portrait photograph of the person in this image";

    console.log(`[generate-pack-v2] Starting Omniscient Visual Architect v2.1 ${styleType} pack generation with ${sceneCount} scenes`);
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

Apply the 7-Layer Prompt Architecture with FACE VISIBILITY as the #1 priority:
1. Scene Foundation - Framing (close-up to medium close-up) + subject state
2. Technical Camera Setup - Portrait lenses (50-135mm), aperture f/1.4-f/2.8
3. Lighting Design - Precise light sources that sculpt the face
4. Environmental Context - Blurred/secondary backgrounds
5. Color Science - Colorist instructions with skin tone focus
6. Compositional Rules - Face placement, headroom, eye positioning
7. Quality Markers - Tack-sharp focus on face and eyes

Use the Face-Blind Technique:
- Generic subject descriptors only ("A person", "The subject")
- Obsessive detail around the face, not on it
- Face is CLEARLY VISIBLE and SHARP in ALL scenes

## CRITICAL FRAMING REQUIREMENTS:
- MINIMUM: Tight head-and-shoulders (headshot)
- MAXIMUM: Mid-chest up (upper body portrait)
- FORBIDDEN: Full body, wide shots, distant framing, back turned

## NAMING REQUIREMENTS:
- pack_id uses underscores: "category_style_identifier"
- pack_name is EXACT title-case transformation: "Category Style Identifier"
- meta.gender = "${normalizedGender}"
- meta.category = "${category}"

## OUTPUT REQUIREMENTS:
- global_style_anchor = 60-100 words, starts with "${anchorStart}..."
- Each scene.prompt uses all 7 layers with face visibility confirmation
- ${sceneCount} meaningfully different scenes within tight framing
- POSITIVE descriptions only (no negation)
- Face prominent, sharp, and primary focal point in EVERY scene

Output pure JSON only.`;
    } else {
      // Reference Image Mode - Style Extraction
      userPrompt += `

---

## OMNISCIENT VISUAL ANALYSIS TASK:

Analyze the uploaded reference image using the 7-Layer framework with FACE VISIBILITY as the #1 priority.

### FORENSIC EXTRACTION (Global Style Anchor):

**Layer 1 - Scene Foundation:**
What is the framing (close-up, medium close-up)? What is the subject's expression and head position?

**Layer 2 - Technical Camera Setup:**
Identify portrait lens characteristics (50-135mm range), aperture (f/1.4-f/2.8), sensor/film stock.

**Layer 3 - Lighting Design:**
Map all light sources sculpting the face, directions (degrees), quality (hard/soft), color temperature (Kelvin), intensity ratios.

**Layer 4 - Environmental Context:**
Analyze background treatment (always blurred/secondary), depth cues, atmospheric conditions framing the face.

**Layer 5 - Color Science:**
Extract skin tone rendering, shadow tones, midtone character, highlight handling, saturation zones.

**Layer 6 - Compositional Rules:**
Identify face placement, headroom, eye-line positioning, negative space within tight frame.

**Layer 7 - Quality Markers:**
Note face sharpness, eye detail, skin texture rendering, grain structure, finishing style.

### SUBJECT NEUTRALIZATION (Face-Blind Technique):

Replace all identity-specific features with generic descriptors:
- "A person" instead of specific identity
- Focus on expression, head tilt, gaze direction
- Describe everything AROUND the face with obsessive detail

### SPECIFICATIONS:
- Category: ${category}${subcategory ? ` / ${subcategory}` : ""}
- Gender: ${normalizedGender}
- Scene Count: ${sceneCount}
${styleContext}
${lightingContext}
${colorContext}

### CRITICAL FRAMING REQUIREMENTS:
- All ${sceneCount} scenes must use close-up to medium close-up framing
- Face clearly visible and sharp in every scene
- Forbidden: Full body, wide shots, distant framing

### NAMING REQUIREMENTS:
- pack_id uses underscores: "category_style_identifier"
- pack_name is EXACT title-case transformation: "Category Style Identifier"

### OUTPUT REQUIREMENTS:
- meta.gender = "${normalizedGender}"
- meta.category = "${category}"
- global_style_anchor = Dense 60-100 word paragraph capturing visual DNA, starts with "${anchorStart}..."
- ${sceneCount} scenes using 7-layer architecture with face visibility in each
- Diversify across: Lighting Moods, Environmental Context (blurred), Framing/Angle Variations
- POSITIVE descriptions only, face sharp and prominent in every scene

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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${GEMINI_API_KEY}`,
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
