CREATE TABLE public.gemini_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  function_name TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  candidates_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  image_count INTEGER NOT NULL DEFAULT 0,
  resolution TEXT,
  estimated_cost_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.gemini_usage_logs TO authenticated;
GRANT ALL ON public.gemini_usage_logs TO service_role;

ALTER TABLE public.gemini_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage logs"
ON public.gemini_usage_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE INDEX idx_gemini_usage_logs_user_created ON public.gemini_usage_logs(user_id, created_at DESC);
CREATE INDEX idx_gemini_usage_logs_function ON public.gemini_usage_logs(function_name);