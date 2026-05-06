-- Data Lineage Flows — Phase 2 of the Strata roadmap.
-- Records explicit agent-declared flows: Server A (source) → Server B (dest).
-- Risk signals are denormalized at insert time so the dashboard never joins mcp_servers.

CREATE TABLE public.data_lineage_flows (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id              uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agent_id                text,                                    -- optional agt_<32hex>
  session_id              text,                                    -- caller-supplied run/trace ID

  -- Source: where data was READ from
  source_server_url       text        NOT NULL,
  source_tool             text,
  source_mcp_server_id    uuid        REFERENCES public.mcp_servers(id) ON DELETE SET NULL,

  -- Destination: where data was SENT to
  dest_server_url         text        NOT NULL,
  dest_tool               text,
  dest_mcp_server_id      uuid        REFERENCES public.mcp_servers(id) ON DELETE SET NULL,

  -- Risk signals (denormalized from mcp_servers at write time)
  source_capability_flags text[],
  dest_capability_flags   text[],
  dest_has_net_egress     boolean     NOT NULL DEFAULT false,      -- 'net_egress' in dest_capability_flags

  -- Data characterization (caller-reported)
  data_tags               text[],                                  -- ['pii','credentials','financial','internal']

  -- Computed risk level
  risk_level              text        CHECK (risk_level IN ('low','medium','high','critical')),

  -- Optional back-references to agent_activity_ledger rows
  ledger_entry_ids        uuid[],

  created_at              timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT lineage_different_servers CHECK (source_server_url <> dest_server_url)
);

CREATE INDEX idx_lineage_profile_created ON public.data_lineage_flows(profile_id, created_at DESC);
CREATE INDEX idx_lineage_session         ON public.data_lineage_flows(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_lineage_agent           ON public.data_lineage_flows(agent_id)   WHERE agent_id IS NOT NULL;
-- Hot path: dashboard "egress risks" filter
CREATE INDEX idx_lineage_net_egress      ON public.data_lineage_flows(profile_id) WHERE dest_has_net_egress = true;
CREATE INDEX idx_lineage_dest_server     ON public.data_lineage_flows(dest_server_url);

ALTER TABLE public.data_lineage_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY lineage_select_own
  ON public.data_lineage_flows FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON public.data_lineage_flows FROM authenticated;

-- ── Sessions summary RPC ──────────────────────────────────────────────────────
-- Returns one row per distinct session_id for a given profile, with aggregate stats.
-- Used by GET /api/v1/lineage/sessions.

CREATE OR REPLACE FUNCTION public.get_lineage_sessions(p_profile_id uuid)
RETURNS TABLE (
  session_id           text,
  flow_count           bigint,
  highest_risk         text,
  distinct_server_count bigint,
  has_net_egress       boolean,
  first_at             timestamptz,
  last_at              timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    session_id,
    COUNT(*)                                                         AS flow_count,
    -- Risk hierarchy: critical > high > medium > low
    CASE
      WHEN bool_or(risk_level = 'critical') THEN 'critical'
      WHEN bool_or(risk_level = 'high')     THEN 'high'
      WHEN bool_or(risk_level = 'medium')   THEN 'medium'
      ELSE 'low'
    END                                                              AS highest_risk,
    COUNT(DISTINCT source_server_url) + COUNT(DISTINCT dest_server_url) AS distinct_server_count,
    bool_or(dest_has_net_egress)                                     AS has_net_egress,
    MIN(created_at)                                                  AS first_at,
    MAX(created_at)                                                  AS last_at
  FROM   public.data_lineage_flows
  WHERE  profile_id = p_profile_id
    AND  session_id IS NOT NULL
  GROUP  BY session_id
  ORDER  BY MAX(created_at) DESC
  LIMIT  200
$$;
