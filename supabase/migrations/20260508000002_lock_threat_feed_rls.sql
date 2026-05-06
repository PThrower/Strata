-- Lock threat_feed behind RLS so only service role can read.
-- Without this, any authenticated user could bypass the metered /api/v1/threats
-- route and scrape the full feed via direct Supabase client.
--
-- The API route at /api/v1/threats uses createServiceRoleClient() (returned by
-- authenticateRequest) which bypasses RLS — so the route continues to work.
-- The trigger also runs as service role and bypasses RLS.

ALTER TABLE public.threat_feed ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT/UPDATE/DELETE policy for anon or authenticated.
-- Belt-and-suspenders REVOKE in case Supabase default grants change.
REVOKE ALL ON public.threat_feed FROM anon, authenticated;
