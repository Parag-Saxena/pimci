ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS writing_style jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.writing_style IS
  'User writing-style preferences applied to AI post generation. See src/lib/writing-style.ts for shape.';