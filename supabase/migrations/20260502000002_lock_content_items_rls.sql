-- C-2: Migration 20260501000004 recreated content_items_public_read with
-- USING (NOT is_quarantined). That reopened the anon-key paywall bypass
-- deliberately closed in 20260429000003: with the anon key (shipped to every
-- browser) any visitor could SELECT directly from content_items, bypassing
-- API-key auth, tier gating, the free-tier 24h news delay, and audit logging.
--
-- The intended quarantine filter is already enforced inside the API code
-- (.eq('is_quarantined', false)) and inside the search_content_items RPC
-- (NOT ci.is_quarantined). Dropping the public-read policy puts content_items
-- back behind the service role.

DROP POLICY IF EXISTS content_items_public_read ON public.content_items;

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.content_items FROM anon, authenticated;
