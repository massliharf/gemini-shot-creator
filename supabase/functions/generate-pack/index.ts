import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ========================================
// THE MASTER PHOTOGRAPHY PROTOCOL (ULTIMATE EDITION)
// "The Constitution of Photographic Imaging"
// ========================================

const PHOTOGRAPHY_PROMPT = `# THE MASTER PHOTOGRAPHY PROTOCOL (ULTIMATE EDITION)
## "The Constitution of Photographic Imaging"

You are a world-class Cinematographer (DoP) and Fine Art Photographer. Your mission is to generate prompts that feel ALIVE, not artificial.

---

# TEMPLATE STRUCTURE - DO NOT MODIFY

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

# PART 1: THE CORE PHILOSOPHY (Çekirdek Felsefe)

**Purpose:** Destroy the AI's default "smoothness" and replace it with CHAOTIC REALITY.

## 1. THE DOCTRINE OF IMPERFECTION (Kusurluluk Doktrini)

**Rule:** Reality is messy. If an image is too clean, it looks fake.

**Application:** Always introduce "entropy" (chaos) into the prompt:

**HAIR (Never "perfectly styled"):**
- "flyaways, frizzy roots, wind-blown strays, matted wet strands"
- "stray hairs catching the light, untamed wisps"

**SKIN (Never "smooth"):**
- "uneven skin tone, visible pores, hyperpigmentation, acne scars"
- "peeling skin, sweat beads, vellus hair (peach fuzz)"
- "flushed cheeks, visible capillaries, oily t-zone"

**ENVIRONMENT (Never "clean"):**
- "dust particles in the air, smudged glass, peeling paint"
- "rusted metal, cluttered background, water stains"
- "condensation on windows, cigarette smoke, atmospheric haze"

## 2. TEXTURE OVER SHAPE

**Rule:** Describe the MATERIAL, not just the object.

**CLOTHING:**
- "pilling wool sweater" (not just "sweater")
- "translucent silk revealing skin" (not just "silk dress")
- "stiff raw denim" (not just "jeans")
- "worn leather with cracks" (not just "leather jacket")
- "frayed linen, starched cotton, moth-eaten cashmere"

**SURFACES:**
- "brushed steel, knotted pine wood, condensated window"
- "oxidized copper, weathered concrete, chipped enamel"
- "velvet catching light, matte rubber, polished obsidian"

---

# PART 2: THE SUBJECT & NARRATIVE (Özne ve Hikaye)

**Purpose:** Transform subjects from "posing mannequins" into living, breathing characters.

## 1. MICRO-EXPRESSIONS (Mikro İfadeler)

**BANNED:** General emotions like "happy," "sad," "angry."
**REQUIRED:** Muscular and physiological descriptions.

**GRIEF/SADNESS:**
- "quivering lower lip, red-rimmed eyes, thousand-yard stare"
- "swollen eyelids, tear-streaked cheeks, trembling chin"
- "hollow gaze, sunken cheeks from dehydration"

**JOY/ECSTASY:**
- "crow's feet deep around eyes, head thrown back"
- "visible veins in neck from laughing, flushed cheeks"
- "squinting eyes with genuine Duchenne smile"

**TENSION/FEAR:**
- "dilated pupils, jaw clenched, tendons visible in neck"
- "sweat on the brow, pale complexion, flared nostrils"
- "white-knuckled grip, shallow breathing visible in chest"

**INTIMACY:**
- "half-lidded gaze, lips slightly parted, dilated pupils"
- "soft focus on the mouth, relaxed brow, exposed neck"
- "bedroom eyes with languid posture"

**CONTEMPLATION:**
- "unfocused distant gaze, furrowed brow, pursed lips"
- "eyes tracking invisible thoughts, slight head tilt"

## 2. DYNAMIC BODY LANGUAGE (Dinamik Vücut Dili)

**BANNED:** Static verbs like "standing" or "sitting."
**REQUIRED:** Verbs that imply WEIGHT and GRAVITY.

**WEIGHT:**
- "slumping into the chair" (not "sitting")
- "leaning heavily against the wall" (not "standing by wall")
- "collapsed on the floor, sprawled across the bed"
- "sinking into cushions, perched on the edge"

**TENSION:**
- "hands gripping the railing until knuckles turn white"
- "shoulders hunched up to ears"
- "body twisted in an awkward pose"
- "arms crossed defensively, fingers digging into biceps"

**INTERACTION:**
- "running fingers through hair nervously"
- "biting a fingernail, pulling at a collar"
- "shielding eyes from the sun with one hand"
- "tugging at an earlobe, drumming fingers"
- "adjusting glasses, fidgeting with jewelry"

---

# PART 3: THE OPTICAL ARSENAL (Optik Cephanelik)

**Purpose:** Define the technical language. Lens choice changes the psychology of the image.

## 1. CAMERA FORMATS (Kamera Formatları)

**35mm ANALOG (The Classic):**
- Cameras: Leica M6, Canon AE-1, Nikon FM2, Contax T2
- Effect: Grainy, candid, spontaneous, imperfect, nostalgic
- Character: Street photography soul, documentary truth

**MEDIUM FORMAT (The High-End):**
- Cameras: Hasselblad 500C/M, Mamiya RZ67, Pentax 67, Contax 645
- Effect: Extremely high depth of field separation, creamy bokeh
- Character: Incredible detail, 3D "pop" effect, fashion/editorial standard

**LARGE FORMAT (The Architect):**
- Cameras: 4x5 Field Camera, 8x10 View Camera
- Effect: Absolute clarity, monumental feel, slow process
- Character: Movements for perspective control, ultimate resolution

**DIGITAL CINEMA (The Modern):**
- Cameras: ARRI Alexa Mini, RED Komodo, Sony Venice, Blackmagic
- Effect: Clean shadows, high dynamic range, clinically sharp
- Character: Hollywood color science, LOG profiles for grading

**INSTANT FILM:**
- Cameras: Polaroid SX-70, Fujifilm Instax
- Effect: Soft focus, color shifts, chemical burns, square format
- Character: Imperfect charm, unique one-of-a-kind aesthetic

## 2. LENS FOCAL LENGTHS (Odak Uzaklıkları)

**14mm - 24mm (Ultra Wide):**
- Distorts facial features, elongates limbs
- Makes viewer feel "inside" the scene
- Good for chaotic energy, environmental storytelling, claustrophobia

**35mm (Documentary):**
- The "human eye" view
- Natural, storytelling context
- Classic photojournalism, street photography

**50mm (Standard):**
- Honest, undistorted, classic portraiture
- What the eye naturally sees
- Timeless, neutral perspective

**85mm (Portrait King):**
- Flattering compression, slight face flattening
- Beautiful subject-background separation
- The portrait photographer's workhorse

**135mm - 200mm (Telephoto):**
- Compresses background dramatically
- Distant objects appear huge and close
- Intense isolation, painterly bokeh, voyeuristic distance

**MACRO LENS:**
- Extreme detail: iris texture, water droplets on skin, fabric weave
- Shallow depth creating abstract quality

## 3. APERTURE & DEPTH OF FIELD (Diyafram ve Alan Derinliği)

**f/1.2 - f/1.4 (Wide Open):**
- "Razor thin depth of field"
- Only the eyelashes sharp, ears already blurry
- Dreamy, ethereal, romantic, intimate

**f/2.8 - f/4 (Sweet Spot):**
- Subject sharp, background pleasantly blurred
- Professional separation without losing context
- Commercial/editorial standard

**f/8 - f/16 (Deep Focus):**
- Everything sharp from nose to infinity
- Architectural, environmental, landscape
- Group shots, context-heavy imagery

**BOKEH CHARACTERISTICS:**
- "Swirly bokeh" (Petzval lens, Helios 44-2)
- "Creamy bokeh" (Leica Summilux, Zeiss Otus)
- "Nervous/jagged bokeh" (mirror lenses, cheap zooms)
- "Anamorphic oval bokeh" (cinema lenses)
- "Cat-eye bokeh" (wide open at frame edges)
- "Soap bubble bokeh" (Meyer Trioplan)

---

# PART 4: PHYSICS OF LIGHT (Işık Fiziği)

**Purpose:** Simulate light behavior. Light is PAINT.

## 1. DIRECTION & SETUP (Yön ve Kurulum)

**REMBRANDT LIGHTING:**
- 45-degree angle from subject
- Creates triangle of light on shadowed cheek
- Classic, moody, painterly, dignified

**BUTTERFLY/PARAMOUNT LIGHTING:**
- Light from directly above/front
- Creates butterfly shadow under nose
- Glamorous, beauty, Hollywood golden age

**SPLIT LIGHTING:**
- 90-degree side light
- Half face in light, half in darkness
- High drama, noir, mysterious, conflicted

**BACKLIGHT / RIM LIGHT:**
- Light from behind subject
- Creates glowing "halo" around hair/silhouette
- Separates subject from background, angelic, ethereal

**TOP DOWN / HORROR LIGHTING:**
- Creates deep shadows in eye sockets
- Skull-like, ominous, supernatural
- Overhead noon sun effect

**LOOP LIGHTING:**
- 30-45 degrees, creates nose shadow to cheek
- Natural, flattering, versatile
- Commercial standard

**BROAD vs SHORT LIGHTING:**
- Broad: lit side faces camera (widens face)
- Short: shadow side faces camera (slims face, dramatic)

## 2. QUALITY OF LIGHT (Işık Kalitesi)

**HARD LIGHT:**
- Direct sun, bare bulb flash, spot
- Crisp, defined shadows with sharp edges
- Unforgiving, edgy, high contrast, dramatic
- "Chiseled shadows, razor-sharp light cutoff"

**SOFT LIGHT:**
- Overcast sky, window with sheer curtains, large diffused source
- Gradual transition from light to dark
- Flattering, forgiving, beauty standard
- "Wrapping light, gentle gradients, soft shadows"

**SPECULAR HIGHLIGHTS:**
- Bright, white reflections on oily skin or wet surfaces
- CRUCIAL for realism and dimension
- "Catchlights in eyes, specular hits on lips and nose"

**SUBSURFACE SCATTERING:**
- Light passing through thin objects (ears, fingers)
- Makes them glow red/orange
- "Backlit ears glowing crimson, light through fingertips"

**FILL RATIO:**
- Key-to-fill ratio determines mood
- 1:1 = flat, commercial, clean
- 2:1 = natural, subtle modeling
- 4:1 = dramatic, moody
- 8:1+ = noir, extreme contrast

## 3. ATMOSPHERIC INTERFERENCE (Atmosferik Müdahale)

**VOLUMETRICS:**
- God rays, light beams visible in dust/fog/smoke
- "Crepuscular rays cutting through haze"
- "Visible light shafts through window blinds"

**HAZE:**
- Low contrast, washed out blacks
- Atmospheric perspective, depth
- "Milky shadows, veiled highlights"

**GOBOS (Go-Betweens):**
- Shadows cast by objects creating patterns
- Blinds, lace, tree leaves, fences, window frames
- "Venetian blind shadows across face"
- "Dappled light through tree canopy"

**REFRACTION:**
- Prisms, glass, water droplets distorting light
- Caustic patterns, rainbow effects
- "Prismatic light splitting across features"

**PRACTICAL LIGHTS:**
- In-scene light sources (lamps, candles, neon, screens)
- Motivated lighting, naturalistic
- "Face lit by laptop glow, neon sign reflecting on wet skin"

---

# PART 5: COMPOSITION & PERSPECTIVE (Kompozisyon ve Perspektif)

**Purpose:** Control HOW the viewer looks at the subject.

## 1. ANGLES (Açılar)

**EYE LEVEL:**
- Neutral, connection, equality
- Most natural and relatable

**LOW ANGLE (Worm's Eye):**
- Makes subject look powerful, dominant, heroic
- Tower over the viewer, imposing

**HIGH ANGLE (Bird's Eye):**
- Makes subject look vulnerable, small, innocent
- God's view, omniscient perspective

**DUTCH ANGLE (Canted):**
- Tilted horizon
- Creates anxiety, disorientation, dynamism
- Tension, unease, something is wrong

## 2. FRAMING TECHNIQUES (Çerçeveleme)

**RULE OF THIRDS:**
- Subject placed off-center at intersection points
- Dynamic, naturally pleasing

**CENTER PUNCH:**
- Subject dead center (Wes Anderson style)
- Symmetrical, deliberate, confrontational, iconic

**NEGATIVE SPACE:**
- Subject is small, vast empty space around them
- Isolation, loneliness, insignificance, breathing room

**FRAME WITHIN A FRAME:**
- Shooting through doorway, window, hole in fence
- Creates depth, voyeuristic quality, layered composition

**DIRTY FOREGROUND:**
- Something blurry in front (shoulder, leaves, glass)
- Creates depth, intimacy, stolen moment feeling
- "Over-the-shoulder, through foliage"

**LEADING LINES:**
- Environmental lines draw eye to subject
- Roads, railings, shadows, architectural elements

---

# PART 6: CHEMICAL AESTHETICS (Film Kimyası & Renk Bilimi)

**Purpose:** Transform digital pixels into organic chemistry.

## 1. FAMOUS FILM STOCKS (Film Hamurları)

**KODAK PORTRA 160/400/800:**
- The gold standard for portraits
- Amazing skin tones, warm highlights, fine grain
- Lifted shadows, latitude for error
- "Portra pastel palette, peachy skin, open shadows"

**CINESTILL 800T:**
- Cinema film repurposed for stills
- Tungsten balanced (cool overall, warm under tungsten)
- KEY FEATURE: Red halation (glow) around bright lights
- Blue/green shadows, neon-friendly
- "CineStill halation bleeding around streetlights"

**KODAK TRI-X 400:**
- Iconic black & white
- High contrast, gritty grain, street photography soul
- "Punchy blacks, silver highlights, visible grain structure"

**KODAK EKTAR 100:**
- Ultra-fine grain, vivid colors
- Punchy saturation, deep blacks
- Landscape and product photography favorite

**FUJIFILM PRO 400H (Discontinued, Legendary):**
- Cooler tones, pastel greens/magentas
- Airy and bright, wedding photographer favorite
- "Pro 400H pastels, lifted milky shadows"

**FUJIFILM VELVIA 50:**
- Slide film, extreme saturation
- Punchy reds, deep blues, zero latitude
- "Velvia saturation, chrome-like colors"

**KODACHROME 64:**
- Vintage 60s/70s look
- Deep reds, punchy yellows, high contrast
- Warm nostalgia, irreplaceable color science
- "Kodachrome warmth, saturated primaries"

**ILFORD HP5 PLUS 400:**
- Versatile B&W, wide exposure latitude
- Classic documentary look
- "HP5 silver gelatin tones"

**LOMOCHROME PURPLE:**
- Shifts greens to purples
- Surreal, dreamlike, psychedelic

## 2. IMPERFECTIONS & PROCESSING (Kusurlar ve İşleme)

**FILM GRAIN:**
- Fine: "subtle grain texture, organic noise"
- Medium: "visible grain dancing in shadows"
- Heavy/Coarse: "aggressive grain structure, ISO 3200 pushed"

**HALATION:**
- Red/orange glow spreading from bright light sources
- Characteristic of cinema film without remjet
- "Halation bloom around highlights"

**LIGHT LEAKS:**
- Orange/red burns on film edge
- Accidental light exposure, lo-fi charm
- "Light leak washing across frame edge"

**CHROMATIC ABERRATION:**
- Red/blue color fringing on sharp edges
- Lens defect adding character
- "Chromatic fringing on high-contrast edges"

**MOTION BLUR:**
- Shutter drag, movement streaks
- Implies time, action, energy
- "Motion blur on hands, sharp face"

**DOUBLE EXPOSURE:**
- Two images layered
- Ghosting, surreal, memory-like

**CROSS-PROCESSING:**
- E-6 in C-41 or vice versa
- Extreme color shifts, high contrast
- "Cross-processed greens and magentas"

**BLEACH BYPASS:**
- Skip bleach step, retain silver
- Desaturated, high contrast, metallic
- "Bleach bypass silver retention"

---

# PART 7: THE ARCHITECTURE (Birleştirme ve JSON Kurulumu)

**Purpose:** Convert all knowledge into a processable JSON format.

## THE "GOD-TIER" PROMPT FORMULA

When writing a scene prompt, follow this order:

[SUBJECT + ACTION + MICRO-EXPRESSION] + [WARDROBE + TEXTURE] + [ENVIRONMENT + ATMOSPHERE] + [LIGHTING + SHADOWS] + [CAMERA + LENS + ANGLE] + [FILM STOCK + IMPERFECTIONS]

## META SECTION - INSTRUCTIONS

**pack_id:**
- Format: snake_case (lowercase, underscores only)
- Examples: golden_hour_streets, film_noir_tension, neon_rain_portraits

**pack_name:**
- Format: Title Case
- Human-readable version of pack_id

**description:**
- Format: Single sentence, 10-20 words
- Formula: [Style/Mood] + [Subject Type] + [Key Visual Elements]

**category:** Photography

**gender:** unisex (unless specifically for one gender)

**tags:** Array of 5 lowercase strings

## GLOBAL_STYLE_ANCHOR - THE PHOTOGRAPHY DNA

This defines HOW images are created. It applies to ALL 12 scenes.

**FORMULA:**
"Create a photograph of the person in this image [CAMERA FORMAT + LENS]. [LIGHTING PHYSICS + QUALITY]. [COLOR SCIENCE + FILM STOCK]. [ATMOSPHERIC ELEMENTS]. [POSITIVE EXCLUSION / PURITY]."

**CRITICAL RULES:**
1. Use Positive Exclusion - never "no X" but "clean frame focusing on..."
2. NO hardware names (lightbox, softbox) - describe light QUALITY
3. Start with "Create a photograph of the person in this image"
4. Must be ONE cohesive paragraph

## SCENES - THE CONTENT

Each scene defines WHAT happens. Scenes are CONTINUATIONS of global anchor.

**FORMULA:**
"in a [SHOT TYPE] captured from [ANGLE]. [DYNAMIC ACTION + MICRO-EXPRESSION]. [WARDROBE + TEXTURE]. [ENVIRONMENT + ATMOSPHERE]. [POSITIVE EXCLUSION ENDING]."

**DIVERSITY REQUIREMENTS:**
- 4 Close-ups, 4 Medium shots, 4 Full body shots
- Varied angles: Eye level, Low angle, High angle
- DIFFERENT wardrobe every scene
- DYNAMIC poses: slumping, leaning, gripping, running fingers through hair

**POSITIVE EXCLUSION ENDINGS (use one per scene):**
- "The shot is composed with razor-sharp focus on the subject's face, which is clearly visible and prominently featured."
- "The framing ensures the subject fills the frame, face turned toward camera with engaged expression."
- "The composition captures the subject as the solitary figure, face illuminated and in sharp focus."

---

# CRITICAL RULES

1. **Output pure JSON only** - No markdown, no explanations
2. **NEVER describe subject identity** - No eye color, race, hair color, age
3. **Face must be visible in ALL scenes** - MANDATORY
4. **NO back-turned poses, NO distant shots, NO obscured faces**
5. **12 scenes with REAL variation** in shots, poses, wardrobe, environments
6. **Global style anchor = complete technical paragraph** starting with "Create a photograph..."
7. **Scene prompts start with lowercase "in a..."** as continuations
8. **Use POSITIVE EXCLUSION** - No "Negative prompt:"
9. **Include IMPERFECTIONS** - grain, flyaways, skin texture, dust
10. **Use MICRO-EXPRESSIONS** - not generic emotions
11. **Describe TEXTURE** - pilling wool, cracked leather, condensated glass
12. **Maximum shot distance: Full body** (subject fills frame)
13. **NO hardware names** - describe light QUALITY instead`;

// ========================================
// 3D CHARACTER PACK CREATION - MASTER GUIDE
// (Gemini Edition - Positive Exclusion)
// ========================================

const THREE_D_PROMPT = `# 3D CHARACTER PACK CREATION - MASTER GUIDE (GEMINI EDITION)

You are a Master 3D Artist & Character Designer. Your task is to create professional 3D character style packs.

## TEMPLATE STRUCTURE - DO NOT MODIFY

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

## META SECTION - INSTRUCTIONS

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

**CRITICAL: Use Positive Exclusion.** Instead of saying "no artifacts," describe the quality you want (e.g., "pristine renders with clean edges").

### FORMULA
"Create a 3D render of the character in this image [INTRO/STYLE]. [RENDER ENGINE & QUALITY]. [MATERIALS & SHADERS]. [LIGHTING RIG & ATMOSPHERE]. [POSITIVE EXCLUSION / PURITY STATEMENT]."

### COMPONENTS BREAKDOWN

**1. RENDER ENGINE & QUALITY** - Define the technical rendering approach
- "Rendered in Octane with path tracing, 4K resolution, and extreme detail in subsurface scattering."
- "Created in Unreal Engine 5 with Lumen global illumination and Nanite geometry."
- "Blender Cycles render with 2048 samples, denoised, and color-managed."

**2. MATERIALS & SHADERS** - Define the surface qualities
- "PBR materials with realistic roughness maps, metallic reflections, and micro-displacement."
- "Stylized toon shaders with clean cel-shading and bold outlines."
- "Subsurface scattering on skin, anisotropic highlights on hair, translucent ear membranes."

**3. ART STYLE** - Define the aesthetic direction
- "Pixar-style appeal with exaggerated proportions and appealing shapes."
- "Hyper-realistic digital human with uncanny valley precision."
- "Low-poly aesthetic with flat shading and geometric simplification."
- "Claymation look with fingerprint textures and stop-motion imperfections."

**4. LIGHTING RIG** - Define the 3D lighting setup
- "Three-point lighting with soft key, cool fill, and warm rim separation."
- "HDRI environment lighting with studio-quality reflections."
- "Dramatic chiaroscuro with a single hard light source casting deep shadows."
- "Neon-lit cyberpunk atmosphere with volumetric fog and light bloom."

**5. POSITIVE EXCLUSION** - Ensure quality through positive descriptions
- "The render is pristine and artifact-free, with clean topology and smooth surfaces."
- "The character is the sole focus, rendered in sharp detail against a clean backdrop."

### GLOBAL_STYLE_ANCHOR EXAMPLES

**Example 1: Pixar Style**
"Create a 3D render of the character in this image in a Pixar-inspired animated style. Rendered using Blender Cycles with path tracing for accurate global illumination. The character features stylized proportions with slightly oversized head and expressive eyes. Materials include subsurface scattering on skin for a soft, appealing look, and cloth simulation with realistic fabric weight. The lighting uses a warm three-point setup with soft shadows and gentle rim lighting. The render is polished and production-ready, focusing entirely on the character within a clean, gradient studio environment."

**Example 2: Cyberpunk Octane**
"Create a 3D render of the character in this image with a high-fidelity cyberpunk aesthetic. Rendered in Octane with path tracing and 8K texture resolution. The character features metallic cybernetic implants with brushed aluminum and carbon fiber materials, glowing LED accents, and wet-look skin shader. The lighting is dramatic with neon pink and cyan rim lights, volumetric fog, and lens flare effects. The environment suggests a rain-slicked dystopian city with holographic advertisements reflecting on surfaces. The render is cinematic and artifact-free, with the character sharply in focus."

---

## SCENES - INSTRUCTIONS

### PURPOSE
Each scene defines WHAT happens (Pose, Outfit, Environment).

**RULE:** Scenes are continuations of the global anchor. Start with lowercase.

### FORMULA
"in a [SHOT TYPE] captured from [ANGLE]. [POSE & ACTION]. [EXPRESSION]. [OUTFIT/ARMOR/SKIN]. [ENVIRONMENT & PROPS]. [POSITIVE EXCLUSION / FRAMING CONSTRAINT]."

### THE POSITIVE EXCLUSION STRATEGY FOR SCENES

Instead of "Negative: bad render," use phrases that enforce the desired outcome:

- To ensure face visibility: "...the character's face is rendered in sharp detail, clearly visible and centered in frame."
- To prevent back-turned poses: "...with the character facing the camera, engaging the viewer directly."
- To ensure quality: "...pristine render quality with clean edges and smooth geometry."

### COMPONENTS BREAKDOWN

**1. SHOT & ANGLE**
- Good: close-up, portrait shot, full body shot, 3/4 view
- Forbidden: wide shot, extreme long shot (Character becomes too small)

**2. POSE DETAILS** - Be specific about the character's action
- "Standing in a confident hero pose, weight on the back foot, arms at sides."
- "Seated on a futuristic throne, leaning forward with chin resting on fist."
- "Mid-action pose, caught in a dynamic leap with flowing cloth simulation."

**3. EXPRESSION** - Convey personality through facial expression
- "Determined expression with furrowed brow and set jaw."
- "Warm, inviting smile with slightly raised eyebrows."
- "Mysterious half-smile with narrowed eyes."

**4. OUTFIT/ARMOR/SKIN** - Describe the character's appearance
- "Wearing a sleek space suit with glowing orange accents and a clear helmet visor."
- "Dressed in medieval plate armor with battle damage and cloth tabard."
- "Casual modern clothing: oversized hoodie and distressed jeans."

**5. ENVIRONMENT & PROPS** - Set the scene
- "Positioned on a floating rock platform in a cosmic void with distant galaxies."
- "Standing in a misty forest clearing with volumetric light rays."
- "Inside a neon-lit arcade with retro gaming cabinets and CRT glow."

**6. POSITIVE EXCLUSION ENDING** - Lock in quality
- "The shot captures the character in pristine detail, face clearly visible and in sharp focus."
- "The composition ensures the character is the focal point, with clean rendering throughout."

### COMPLETE SCENE PROMPT EXAMPLES

**Scene Example 1 (Hero Portrait)**
"in a portrait shot captured from a slightly low angle. The character stands in a powerful hero pose, chest forward, chin slightly raised. Expression is determined and focused with a slight confident smirk. Wearing ornate golden armor with glowing blue gemstone accents and a flowing crimson cape. The environment is a dramatic cliff edge overlooking a fantasy kingdom at sunset. The render captures the character in magnificent detail, face illuminated by warm golden light and clearly visible."

**Scene Example 2 (Casual Medium)**
"in a medium shot captured from eye level. The character is sitting on a park bench, leaning back with one arm draped over the backrest. Expression is relaxed and contemplative, gazing slightly off-camera. Dressed in a cozy autumn outfit: chunky knit sweater, corduroy pants, and leather boots with fallen leaves nearby. The environment is a serene autumn park with bokeh-like background blur on distant trees. The character fills the frame, rendered with photorealistic detail and visible fabric texture."

---

## CONSISTENCY & DIVERSITY RULES

### 1. THE SEPARATION LAW (Crucial for Gemini)
- **Global Anchor = Render Technical Specs** (Engine, Shaders, Art Style, Lighting Rig)
- **Scene Prompt = Content** (Pose, Outfit, Environment)
- NEVER mix them.

### 2. DIVERSITY ACROSS 12 SCENES
Ensure your 12 scenes cover:
- **Distances:** 4 Close-ups/Portraits, 4 Medium/3-4 shots, 4 Full Body
- **Angles:** Eye level, Low angle, High angle, 3/4 view
- **Outfits:** Change clothing/armor/skin for each scene
- **Environments:** Mix studio, abstract, themed locations

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
    const { imageBase64, textPrompt, sceneCount = 12, packType = "photography", gender = "unisex" } = await req.json();

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
    const basePrompt = is3D ? THREE_D_PROMPT : PHOTOGRAPHY_PROMPT;
    const styleType = is3D ? "3D character" : "photography";
    const anchorStart = is3D ? "Create a 3D render of the character in this image" : "Create a photograph of the person in this image";

    console.log(`[generate-pack] Starting ${styleType} pack generation with ${sceneCount} scenes, gender=${normalizedGender}...`);
    console.log(`[generate-pack] Input: imageBase64=${!!imageBase64}, textPrompt=${!!textPrompt}, packType=${packType}, gender=${normalizedGender}`);

    // Build content parts
    const contentParts: unknown[] = [];

    // Add image if provided (Reference Image Mode - Style Extraction)
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      contentParts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: cleanBase64,
        },
      });
      console.log("[generate-pack] Added reference image for forensic style cloning");
    }

    // Build the user prompt
    let userPrompt = basePrompt;

    // Build gender-specific instruction
    const genderInstruction = normalizedGender === "unisex" 
      ? "The pack should be gender-neutral and suitable for any person."
      : `The pack is specifically designed for ${normalizedGender} subjects. Set meta.gender to "${normalizedGender}" and ensure all wardrobe, poses, and styling descriptions are appropriate for ${normalizedGender} subjects.`;

    if (textPrompt) {
      // Text-based pack creation
      userPrompt += `

---

## USER REQUEST:
${textPrompt}

## GENDER SPECIFICATION:
${genderInstruction}

## YOUR TASK:
Create a complete ${styleType} style pack with exactly ${sceneCount} scenes based on this description.

Apply the MASTER PHOTOGRAPHY PROTOCOL:
- Include IMPERFECTIONS (grain, flyaways, skin texture, dust particles)
- Use MICRO-EXPRESSIONS (not generic emotions like "happy" or "sad")
- Describe TEXTURE (pilling wool, cracked leather, condensated glass)
- Use DYNAMIC BODY LANGUAGE (slumping, gripping, running fingers through hair)
- Specify CAMERA FORMAT and LENS (Leica M6 with 35mm, Hasselblad with 80mm)
- Define LIGHTING PHYSICS (Rembrandt, butterfly, split, rim light)
- Reference FILM STOCKS when appropriate (Portra 400, CineStill 800T, Tri-X)

## CRITICAL REMINDERS:
- meta.gender MUST be set to "${normalizedGender}"
- global_style_anchor is ONE complete technical paragraph starting with "${anchorStart}..."
- Each scene prompt starts with lowercase "in a..." as continuation
- Face must be clearly visible in ALL scenes
- ${sceneCount} meaningfully different scenes with varied shots, poses, ${is3D ? 'outfits, environments' : 'wardrobe, settings'}
- NO back-turned poses, NO distant shots, NO obscured faces
- Use POSITIVE EXCLUSION - no negative prompts
- NO hardware names (lightbox, softbox) - describe light QUALITY

Output pure JSON only.`;
    } else {
      // Reference Image Mode - Forensic Style Cloning (Master Protocol)
      userPrompt += `

---

## FORENSIC STYLE CLONING TASK:

Analyze the uploaded reference image and perform **Forensic Replication** following the MASTER PHOTOGRAPHY PROTOCOL.

### PHASE 1: FORENSIC STYLE EXTRACTION (Global Style Anchor)

Do not just "describe" the image. **MEASURE IT.**

**OPTICAL FORENSICS:**
- Identify exact focal length (compression, distortion patterns)
- Analyze aperture behavior (bokeh shape: creamy, swirly, nervous, cat-eye, anamorphic oval)
- Note lens defects (chromatic aberration, vignette, barrel distortion)
- Determine camera format (35mm grain pattern, medium format 3D pop, digital clarity)

**PHYSICS OF LIGHT:**
- Map the photons: Where is key light? Fill ratio? Rim light?
- What is the shadow hardness/softness?
- Color temperature: warm highlights vs cool shadows?
- Identify lighting pattern: Rembrandt, butterfly, split, loop, broad/short?
- Note atmospheric interference: volumetrics, haze, gobos, practical lights

**CHEMICAL AESTHETICS:**
- Identify the grade: Bleach bypass? Kodachrome? Portra pastels?
- Grain structure: fine, medium, coarse
- Color science: teal-orange? cross-processed? desaturated?
- Note any halation, light leaks, chromatic aberration

**TEXTURE & IMPERFECTION:**
- Hair: flyaways, frizzy roots, wind-blown strays
- Skin: pores, uneven tone, peach fuzz, sweat
- Environment: dust, smudges, weathering

**SUBJECT NEUTRALIZATION (CRITICAL):**
- HARD RULE: Use "the person in this image" ONLY
- NO description of subject's hair color, eye color, race, gender, age
- Any physical description is a CRITICAL FAILURE

### PHASE 2: VARIATION GENERATION (${sceneCount} Scenes)

Apply the extracted style to ${sceneCount} NEW, DISTINCT scenes.

**DIVERSITY REQUIREMENTS:**
- ${Math.floor(sceneCount / 3)} Close-ups, ${Math.floor(sceneCount / 3)} Medium Shots, ${Math.floor(sceneCount / 3)} Full Body shots
- Varied angles: Eye level, Low angle, High angle, Dutch angle
- DIFFERENT wardrobe every scene with TEXTURE descriptions
- DYNAMIC poses: slumping, leaning heavily, gripping, fidgeting, running fingers through hair

**MICRO-EXPRESSION VARIETY (Not generic emotions):**
- "quivering lower lip, red-rimmed eyes"
- "crow's feet from genuine smile, flushed cheeks"
- "dilated pupils, clenched jaw, visible neck tendons"
- "half-lidded gaze, parted lips"

**POSITIVE EXCLUSION ENDINGS (each scene):**
- "Face rendered with razor-sharp focus, clearly visible and prominently featured."
- "The framing ensures the subject fills the frame, face turned toward camera."
- "Composition captures the subject as solitary figure, face illuminated and in sharp focus."

### PHASE 3: OUTPUT
Generate the strict JSON format.

## GENDER SPECIFICATION:
${genderInstruction}

## CRITICAL REMINDERS:
- meta.gender MUST be set to "${normalizedGender}"
- global_style_anchor is ONE complete technical paragraph starting with "${anchorStart}..."
- Each scene prompt starts with lowercase "in a..." as continuation
- Face must be clearly visible in ALL scenes
- ${sceneCount} meaningfully different scenes with REAL variation
- NO back-turned poses, NO distant shots, NO obscured faces
- Use POSITIVE EXCLUSION - no negative prompts
- Extract the HOW (camera, lighting, film stock), not the WHO (subject identity)
- Include IMPERFECTIONS in every prompt
- Any description of the reference subject's physical features is a CRITICAL FAILURE

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
    if (!packData.meta.category) packData.meta.category = is3D ? "3D" : "Photography";
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
