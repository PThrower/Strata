-- The anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY) is shipped to every browser.
-- A USING (true) policy on content_items lets any visitor SELECT every row
-- directly via PostgREST — bypassing API-key auth, tier gating, is_pro_only
-- filtering, and rate limits.
--
-- All app reads of content_items go through the service role client
-- (lib/api-auth.ts and scripts/refresh/*), so removing the public-read
-- policy does not affect any user-facing flow.
DROP POLICY IF EXISTS "content_items_public_read" ON public.content_items;

-- Same reasoning for ecosystems: the API enforces access via the service
-- role lookup in checkEcosystemAccess(). The catalog itself is non-secret,
-- but pinning it behind the service role removes one more enumeration
-- surface and aligns the data model with the API contract.
DROP POLICY IF EXISTS "ecosystems_public_read" ON public.ecosystems;
