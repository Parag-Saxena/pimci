
-- Enums
CREATE TYPE public.platform AS ENUM ('linkedin', 'x');
CREATE TYPE public.post_status AS ENUM ('draft', 'scheduled', 'ready', 'published', 'failed');

-- Shared updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- post_variants (group of AI-generated variants from one brief)
CREATE TABLE public.post_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brief TEXT NOT NULL,
  tone TEXT,
  platform public.platform NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.post_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own variants" ON public.post_variants
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own variants" ON public.post_variants
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own variants" ON public.post_variants
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own variants" ON public.post_variants
  FOR DELETE USING (auth.uid() = user_id);

-- posts
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform public.platform NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  status public.post_status NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  source_brief TEXT,
  variant_group_id UUID REFERENCES public.post_variants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_posts_user_status ON public.posts(user_id, status);
CREATE INDEX idx_posts_scheduled_at ON public.posts(scheduled_at) WHERE scheduled_at IS NOT NULL;

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own posts" ON public.posts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own posts" ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own posts" ON public.posts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own posts" ON public.posts
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ai_generations log
CREATE TABLE public.ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  prompt TEXT NOT NULL,
  output JSONB NOT NULL,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_generations_user ON public.ai_generations(user_id, created_at DESC);

ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own generations" ON public.ai_generations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own generations" ON public.ai_generations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
