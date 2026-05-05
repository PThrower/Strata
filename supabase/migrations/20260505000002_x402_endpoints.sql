-- x402 payment endpoint verification — Phase 1 of the Strata roadmap.
-- Trust signals for autonomous-payment HTTP 402 endpoints.

CREATE TABLE public.x402_endpoints (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  url                  text        NOT NULL UNIQUE,
  domain               text        NOT NULL,
  first_seen_at        timestamptz NOT NULL DEFAULT now(),
  last_checked_at      timestamptz NOT NULL DEFAULT now(),
  security_score       smallint    CHECK (security_score BETWEEN 0 AND 100),
  is_quarantined       boolean     NOT NULL DEFAULT false,
  payment_amount_usd   numeric,
  payment_currency     text,
  payment_network      text,
  declared_capability  text,
  ssl_valid            boolean,
  domain_age_days      integer,
  flags                text[],
  raw_402_response     jsonb,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_x402_url             ON public.x402_endpoints(url);
CREATE INDEX idx_x402_last_checked_at ON public.x402_endpoints(last_checked_at DESC);

ALTER TABLE public.x402_endpoints ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read every row (the directory is public-read).
-- Insert/update goes through service role only — no policy granted to
-- `authenticated`.
CREATE POLICY x402_select_all
  ON public.x402_endpoints
  FOR SELECT
  TO authenticated
  USING (true);
