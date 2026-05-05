-- Denormalized hot columns for live-probe results on mcp_servers.
-- Avoids joining mcp_runtime_probes for common filter/sort queries (dashboard, search RPC).
-- All other probe schema (mcp_runtime_probes table, mcp_probe_optouts, last_probe_at,
-- last_probe_status) already exists from migration 20260503000001/20260503000002.

ALTER TABLE public.mcp_servers
  ADD COLUMN IF NOT EXISTS last_probe_latency_ms  integer,   -- latency of last probe in ms
  ADD COLUMN IF NOT EXISTS last_probe_drift       boolean;   -- true when probe tool set diverged from static analysis

CREATE INDEX IF NOT EXISTS mcp_servers_last_probe_at_idx
  ON public.mcp_servers (last_probe_at DESC NULLS LAST);
