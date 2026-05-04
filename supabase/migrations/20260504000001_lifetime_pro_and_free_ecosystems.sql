-- ─────────────────────────────────────────────────────────────────────────────
-- Founder access + free-tier ecosystem reconciliation
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Two changes that the marketing/billing/docs surfaces all assumed had already
-- been made but never were:
--
-- 1. profiles.lifetime_pro
--    Founders pay $100 once via the Stripe Payment Link and stay on Pro tier
--    forever. Without this flag, the customer.subscription.deleted webhook
--    handler had no way to distinguish a recurring-pro user from a founder,
--    and could downgrade the wrong account if the founder ever also subscribed
--    to and cancelled monthly Pro.
--
-- 2. ecosystems.available_on_free
--    The marketing page promised "2 ecosystems" on free, the billing page
--    promised "Claude ecosystem only", and the docs listed 5 (claude, openai,
--    gemini, langchain, ollama) under "Free + Pro" — three contradictions
--    rooted in no ecosystem ever being seeded with available_on_free = true.
--    The schema default is false, so list_ecosystems was returning [] for
--    free-tier callers. This migration sets the canonical 5.

-- ── 1. Lifetime-pro flag ────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS lifetime_pro boolean NOT NULL DEFAULT false;

-- Partial index — most rows are false; this keeps the founder-count query and
-- the webhook downgrade-protection lookup fast without bloating storage.
CREATE INDEX IF NOT EXISTS idx_profiles_lifetime_pro
  ON public.profiles(lifetime_pro) WHERE lifetime_pro = true;

-- Prevent users from self-promoting via the dashboard. All writes to this
-- column must go through the Stripe webhook (service role).
REVOKE UPDATE (lifetime_pro) ON public.profiles FROM authenticated;

-- ── 2. Free-tier ecosystem set ──────────────────────────────────────────────

UPDATE public.ecosystems
   SET available_on_free = true
 WHERE slug IN ('claude', 'openai', 'gemini', 'langchain', 'ollama');
