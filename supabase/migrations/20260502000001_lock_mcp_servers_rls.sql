-- C-1: The "service role full access" policy used USING (true) which grants
-- visibility to anon and authenticated, not just service_role. service_role
-- bypasses RLS implicitly, so no policy is needed for it. Drop the policy
-- and revoke direct table grants from anon/authenticated so even a future
-- accidental policy reintroduction stays gated by missing grants.
--
-- All mcp_servers reads go through the service-role client (lib/mcp-tools.ts
-- find_mcp_servers, lib/api-auth.ts via search_mcp_servers RPC, and the
-- refresh/scoring/scan scripts). Removing this policy breaks no user flow.

DROP POLICY IF EXISTS "service role full access" ON public.mcp_servers;

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.mcp_servers FROM anon, authenticated;
