
CREATE TABLE public.text_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prompt TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'flash',
  aspect_ratio TEXT NOT NULL DEFAULT '1:1',
  resolution TEXT NOT NULL DEFAULT '1K',
  image_path TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.text_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own text generations" ON public.text_generations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own text generations" ON public.text_generations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own text generations" ON public.text_generations FOR DELETE TO authenticated USING (auth.uid() = user_id);
