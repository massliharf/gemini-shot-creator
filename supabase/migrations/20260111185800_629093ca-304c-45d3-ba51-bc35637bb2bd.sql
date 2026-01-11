-- Fix: Postgres doesn't support CREATE POLICY IF NOT EXISTS

-- Track which generated folders a user has already downloaded (persists across devices/domains)
CREATE TABLE IF NOT EXISTS public.downloaded_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  folder_name text NOT NULL,
  downloaded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, folder_name)
);

ALTER TABLE public.downloaded_folders ENABLE ROW LEVEL SECURITY;

-- Policies (recreate idempotently)
DROP POLICY IF EXISTS "Users can view their downloaded folders" ON public.downloaded_folders;
CREATE POLICY "Users can view their downloaded folders"
ON public.downloaded_folders
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upsert their downloaded folders" ON public.downloaded_folders;
CREATE POLICY "Users can upsert their downloaded folders"
ON public.downloaded_folders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their downloaded folders" ON public.downloaded_folders;
CREATE POLICY "Users can update their downloaded folders"
ON public.downloaded_folders
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their downloaded folders" ON public.downloaded_folders;
CREATE POLICY "Users can delete their downloaded folders"
ON public.downloaded_folders
FOR DELETE
USING (auth.uid() = user_id);

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at_downloaded_folders()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_downloaded_folders_updated_at ON public.downloaded_folders;
CREATE TRIGGER trg_downloaded_folders_updated_at
BEFORE UPDATE ON public.downloaded_folders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_downloaded_folders();

CREATE INDEX IF NOT EXISTS idx_downloaded_folders_user_id ON public.downloaded_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_downloaded_folders_folder_name ON public.downloaded_folders(folder_name);