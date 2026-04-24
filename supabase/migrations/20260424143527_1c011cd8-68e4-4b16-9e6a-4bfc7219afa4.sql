-- Drop client-side RLS policies on connected_accounts that expose OAuth tokens.
-- All reads/writes for this table now go through server functions using the
-- service-role admin client with explicit user_id filtering, so no client-side
-- access is needed (or safe).
DROP POLICY IF EXISTS "Users view own connected accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users insert own connected accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users update own connected accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users delete own connected accounts" ON public.connected_accounts;

-- RLS stays enabled on the table; with no policies, the anon/authenticated
-- clients have zero access. Server functions using supabaseAdmin (service role)
-- continue to work and bypass RLS.