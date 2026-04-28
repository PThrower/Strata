-- gen_random_bytes() for api_key generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE public.profiles (
  id                     uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                  text        NOT NULL,
  api_key                text        UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  tier                   text        NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
  calls_used             integer     NOT NULL DEFAULT 0,
  calls_reset_at         timestamptz,
  stripe_customer_id     text,
  stripe_subscription_id text,
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ecosystems (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              text        UNIQUE NOT NULL,
  name              text        NOT NULL,
  vendor            text        NOT NULL,
  version           text        NOT NULL,
  status            text        NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'deprecated', 'beta')),
  available_on_free boolean     NOT NULL DEFAULT false
);

-- ecosystem_slug references ecosystems.slug (not id) for readable queries.
-- ON DELETE RESTRICT prevents silent data loss if an ecosystem is removed while content exists.
CREATE TABLE public.content_items (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ecosystem_slug text        NOT NULL REFERENCES public.ecosystems(slug) ON DELETE RESTRICT,
  category       text        NOT NULL CHECK (category IN ('best_practices', 'news', 'integrations')),
  title          text        NOT NULL,
  body           text        NOT NULL,
  source_url     text,
  published_at   timestamptz NOT NULL DEFAULT now(),
  is_pro_only    boolean     NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- api_key and ecosystem are plain text — no FK by design.
-- api_requests is an audit log; records must survive profile deletion and key rotation.
CREATE TABLE public.api_requests (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key     text        NOT NULL,
  tool        text        NOT NULL,
  ecosystem   text        NOT NULL,
  status_code integer     NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Requested indexes
CREATE INDEX idx_profiles_api_key
  ON public.profiles(api_key);

CREATE INDEX idx_content_items_ecosystem_slug
  ON public.content_items(ecosystem_slug);

CREATE INDEX idx_content_items_category
  ON public.content_items(category);

CREATE INDEX idx_content_items_published_at
  ON public.content_items(published_at DESC);

CREATE INDEX idx_api_requests_api_key
  ON public.api_requests(api_key);

CREATE INDEX idx_api_requests_created_at
  ON public.api_requests(created_at DESC);

-- Composite indexes for the two most common query shapes
CREATE INDEX idx_content_items_ecosystem_slug_published_at
  ON public.content_items(ecosystem_slug, published_at DESC);

CREATE INDEX idx_api_requests_api_key_created_at
  ON public.api_requests(api_key, created_at DESC);

-- Stripe webhooks look up profiles by stripe_customer_id
CREATE INDEX idx_profiles_stripe_customer_id
  ON public.profiles(stripe_customer_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecosystems    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_requests  ENABLE ROW LEVEL SECURITY;

-- profiles: authenticated users may read and update only their own row
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Prevent users from self-escalating tier or manipulating billing/usage fields.
-- All writes to these columns must go through service-role API routes.
REVOKE UPDATE (tier, calls_used, calls_reset_at, api_key, stripe_customer_id, stripe_subscription_id)
  ON public.profiles FROM authenticated;

-- ecosystems: public read (anon + authenticated), no write policies
CREATE POLICY "ecosystems_public_read"
  ON public.ecosystems FOR SELECT
  USING (true);

-- content_items: public read (anon + authenticated), no write policies.
-- is_pro_only and available_on_free enforcement is handled in application logic.
CREATE POLICY "content_items_public_read"
  ON public.content_items FOR SELECT
  USING (true);

-- api_requests: no policies — zero user access.
-- Service role (server-side) bypasses RLS and handles all inserts.

-- ============================================================
-- TRIGGER: auto-create profile on auth user signup
-- ============================================================

-- SECURITY DEFINER runs as the function owner, bypassing RLS.
-- This is safer than an INSERT policy because it prevents users from inserting
-- profiles for arbitrary UIDs and ensures api_key is always server-generated.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
