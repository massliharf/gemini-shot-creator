
-- Style Projects table
CREATE TABLE public.style_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Untitled Style',
  analysis_text text,
  reference_image_urls jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.style_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own style projects" ON public.style_projects FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own style projects" ON public.style_projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own style projects" ON public.style_projects FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own style projects" ON public.style_projects FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Style Prompts table
CREATE TABLE public.style_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.style_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  prompt_text text NOT NULL,
  prompt_label text DEFAULT '',
  thumbnail_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.style_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own style prompts" ON public.style_prompts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own style prompts" ON public.style_prompts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own style prompts" ON public.style_prompts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own style prompts" ON public.style_prompts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Style Prompt Images table
CREATE TABLE public.style_prompt_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id uuid NOT NULL REFERENCES public.style_prompts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  image_url text,
  image_path text,
  model text NOT NULL DEFAULT 'flash-3.1',
  aspect_ratio text NOT NULL DEFAULT '1:1',
  resolution text NOT NULL DEFAULT '1K',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.style_prompt_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own prompt images" ON public.style_prompt_images FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own prompt images" ON public.style_prompt_images FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own prompt images" ON public.style_prompt_images FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own prompt images" ON public.style_prompt_images FOR DELETE TO authenticated USING (auth.uid() = user_id);
