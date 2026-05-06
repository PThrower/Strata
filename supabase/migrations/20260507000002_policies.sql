-- Phase 3: Policy Engine — per-profile rules that govern agent behavior.
-- Enforced at the Strata layer before MCP tool calls execute.
-- Rules are evaluated in priority order (ASC); first block wins.
-- All non-null condition fields on a row are ANDed together.
-- Default when no rule matches: allow (policies are opt-in restrictions).

CREATE TABLE public.policies (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id              uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name                    text        NOT NULL,
  description             text,
  enabled                 boolean     NOT NULL DEFAULT true,
  action                  text        NOT NULL CHECK (action IN ('block', 'warn')),

  -- Condition fields — ANDed together; at least one must be non-null (see constraint below)
  match_capability_flags  text[],                   -- server has ANY of these flags
  match_risk_level_gte    text        CHECK (match_risk_level_gte IN ('low','medium','high','critical')),
  match_tool_names        text[],                   -- Strata tool name is in this list
  match_server_url_glob   text,                     -- reserved for v2; schema exists, not evaluated in v1

  -- Time-window condition (UTC hours; both must be set together)
  time_start_hour         smallint    CHECK (time_start_hour BETWEEN 0 AND 23),
  time_end_hour           smallint    CHECK (time_end_hour   BETWEEN 0 AND 23),

  -- Agent scope: NULL = apply to all agents; agt_<hex> = apply only to this agent
  agent_id                text,

  priority                integer     NOT NULL DEFAULT 100 CHECK (priority BETWEEN 1 AND 1000),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT policies_name_nonempty CHECK (length(name) > 0 AND length(name) <= 80),
  -- At least one condition must be present
  CONSTRAINT policies_has_condition CHECK (
    match_capability_flags IS NOT NULL OR
    match_risk_level_gte   IS NOT NULL OR
    match_tool_names       IS NOT NULL OR
    match_server_url_glob  IS NOT NULL OR
    (time_start_hour IS NOT NULL AND time_end_hour IS NOT NULL)
  ),
  -- Time-window fields must be set as a pair
  CONSTRAINT policies_time_pair CHECK (
    (time_start_hour IS NULL) = (time_end_hour IS NULL)
  )
);

CREATE INDEX idx_policies_profile_id      ON public.policies(profile_id);
CREATE INDEX idx_policies_profile_enabled ON public.policies(profile_id) WHERE enabled = true;

ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

-- Owners can read their own policies; no direct writes from authenticated
-- (writes go through service-role API routes).
CREATE POLICY policies_select_own
  ON public.policies FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON public.policies FROM authenticated;
