-- Agent Identity & Credentialing — Phase 2 of the Strata roadmap.
-- Per-agent records bound to a profile. Each row is the authoritative source
-- for an Ed25519-signed JWT that the agent presents to MCP servers / x402
-- endpoints. The JWT itself is stateless and never stored — it is generated
-- once at creation time and revealed to the customer (mirrors the api_key
-- reveal pattern). Online verification can re-check revocation by jti -> id.
--
-- agent_activity_ledger.agent_id (existing free-form text column) intentionally
-- has no FK to this table so anonymous and pre-identity ledger rows still work.
-- When an identity is in use, both columns hold the same agt_<32hex> value.

CREATE TABLE public.agent_identities (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agent_id          text        UNIQUE NOT NULL,             -- 'agt_' + 32 hex chars; goes in JWT.sub
  name              text        NOT NULL,                    -- human label, e.g. 'prod-payment-bot'
  description       text,
  capabilities      text[]      NOT NULL DEFAULT '{}',       -- declared scopes, e.g. ['mcp:invoke','x402:pay']
  metadata          jsonb,                                    -- free-form, customer-defined
  created_at        timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz NOT NULL,                    -- default created_at + 1 year (set in app code)
  last_verified_at  timestamptz,                             -- bumped by online verify endpoint
  revoked_at        timestamptz,                             -- NULL = active
  revocation_reason text,
  CONSTRAINT agent_identities_expires_after_created CHECK (expires_at > created_at),
  CONSTRAINT agent_identities_name_nonempty         CHECK (length(name) > 0 AND length(name) <= 80),
  CONSTRAINT agent_identities_agent_id_format       CHECK (agent_id ~ '^agt_[a-f0-9]{32}$')
);

CREATE INDEX idx_agent_identities_profile_id ON public.agent_identities(profile_id);
CREATE INDEX idx_agent_identities_agent_id   ON public.agent_identities(agent_id);
-- Hot path: list active agents for a profile.
CREATE INDEX idx_agent_identities_active     ON public.agent_identities(profile_id) WHERE revoked_at IS NULL;

ALTER TABLE public.agent_identities ENABLE ROW LEVEL SECURITY;

-- Owners can read their own identities; no insert/update/delete policy from
-- authenticated — writes go through service-role API routes that gate on tier
-- and validate fields.
CREATE POLICY agent_identities_select_own
  ON public.agent_identities FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON public.agent_identities FROM authenticated;
