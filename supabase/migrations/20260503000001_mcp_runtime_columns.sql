-- Runtime behavioral scoring columns on mcp_servers.
-- Complements security_score (repo trust) with a behavior-trust dimension
-- derived from extracted tool definitions, capability flags, and (in Phase 3)
-- live-endpoint probes.
--
-- All NULLABLE so the ALTER is instant on a 2,179-row table — no rewrite, no lock.

ALTER TABLE public.mcp_servers
  ADD COLUMN IF NOT EXISTS runtime_score          numeric,
  ADD COLUMN IF NOT EXISTS runtime_components     jsonb,
  ADD COLUMN IF NOT EXISTS runtime_status         text,           -- 'scored'|'static_only'|'probed'|'no_source'|'opted_out'|'error_*'
  ADD COLUMN IF NOT EXISTS runtime_updated_at     timestamptz,
  ADD COLUMN IF NOT EXISTS capability_flags       text[],         -- ['shell_exec','fs_write','net_egress','secret_read','dynamic_eval','arbitrary_sql','process_spawn']
  ADD COLUMN IF NOT EXISTS tool_count             integer,
  ADD COLUMN IF NOT EXISTS tool_names             text[],
  ADD COLUMN IF NOT EXISTS tool_injection_max     smallint,       -- max scanForInjection score across all tool descriptions
  ADD COLUMN IF NOT EXISTS hosted_endpoint        text,           -- discovered MCP URL, NULL if none
  ADD COLUMN IF NOT EXISTS endpoint_source        text,           -- 'glama'|'readme'|'manifest'|'manual'
  ADD COLUMN IF NOT EXISTS last_probe_at          timestamptz,    -- written by Phase 3 probe runner
  ADD COLUMN IF NOT EXISTS last_probe_status      text,           -- written by Phase 3 probe runner
  ADD COLUMN IF NOT EXISTS npm_package            text,
  ADD COLUMN IF NOT EXISTS pypi_package           text,
  ADD COLUMN IF NOT EXISTS glama_listed           boolean;

CREATE INDEX IF NOT EXISTS mcp_servers_runtime_score_idx
  ON public.mcp_servers (runtime_score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS mcp_servers_runtime_status_idx
  ON public.mcp_servers (runtime_status);

CREATE INDEX IF NOT EXISTS mcp_servers_capability_flags_idx
  ON public.mcp_servers USING gin (capability_flags);

CREATE INDEX IF NOT EXISTS mcp_servers_runtime_stale_idx
  ON public.mcp_servers (runtime_updated_at NULLS FIRST);
