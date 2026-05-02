-- Probe time-series + opt-out blocklist.
-- Schema lands now (Phase 1) so the data model is settled before Phase 3 writes.
-- No service role policies needed — service role bypasses RLS.
-- anon/authenticated have no GRANT and no policy → fully locked down.

CREATE TABLE IF NOT EXISTS public.mcp_runtime_probes (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id           uuid        NOT NULL REFERENCES public.mcp_servers(id) ON DELETE CASCADE,
  probed_at           timestamptz NOT NULL DEFAULT now(),
  endpoint            text        NOT NULL,
  status              text        NOT NULL,         -- 'ok'|'timeout'|'opted_out'|'error_*'
  latency_ms          integer,
  tool_count          integer,
  tool_names          text[],
  capability_flags    text[],
  tool_injection_max  smallint,
  schema_errors       integer,
  drift_from_static   boolean,
  raw_listing         jsonb                          -- truncated tools/list response, cap 64kb at write time
);

CREATE INDEX IF NOT EXISTS idx_probes_server_time
  ON public.mcp_runtime_probes (server_id, probed_at DESC);

CREATE INDEX IF NOT EXISTS idx_probes_recent
  ON public.mcp_runtime_probes (probed_at DESC);

ALTER TABLE public.mcp_runtime_probes ENABLE ROW LEVEL SECURITY;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.mcp_runtime_probes FROM anon, authenticated;

-- Manual opt-out blocklist (support escalations, blanket blocks).
CREATE TABLE IF NOT EXISTS public.mcp_probe_optouts (
  domain      text         PRIMARY KEY,
  reason      text,
  added_at    timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.mcp_probe_optouts ENABLE ROW LEVEL SECURITY;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.mcp_probe_optouts FROM anon, authenticated;
