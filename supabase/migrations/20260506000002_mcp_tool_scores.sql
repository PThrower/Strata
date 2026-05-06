-- Per-tool scores for MCP server tool-level scanning (Phase 1 Item 2).
-- Complements the server-level tool_injection_max and capability_flags columns
-- by attributing risk signals to individual named tools.
--
-- Column is NULLABLE — NULL means the server has not been tool-level scored yet.
-- Storage shape: { "tool_name": { "cap_flags": [...], "injection_score": N, "risk": "low|medium|high|critical" } }

ALTER TABLE public.mcp_servers
  ADD COLUMN IF NOT EXISTS tool_scores jsonb;

COMMENT ON COLUMN public.mcp_servers.tool_scores IS
  'Per-tool risk breakdown keyed by tool name. cap_flags are description-derived '
  '(weaker than source-derived server-level capability_flags). injection_score is '
  'Layer-1 regex only per tool. Populated by the runtime backfill and probe runner.';
