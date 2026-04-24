-- Connected social accounts (LinkedIn, X)
CREATE TABLE public.connected_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  platform public.platform NOT NULL,
  platform_user_id TEXT NOT NULL,
  handle TEXT,
  display_name TEXT,
  avatar_url TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  scope TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT connected_accounts_user_platform_unique UNIQUE (user_id, platform)
);

CREATE INDEX idx_connected_accounts_user ON public.connected_accounts(user_id);
CREATE INDEX idx_connected_accounts_user_platform ON public.connected_accounts(user_id, platform);

ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own connected accounts"
  ON public.connected_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own connected accounts"
  ON public.connected_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own connected accounts"
  ON public.connected_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own connected accounts"
  ON public.connected_accounts FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_connected_accounts_updated_at
  BEFORE UPDATE ON public.connected_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();