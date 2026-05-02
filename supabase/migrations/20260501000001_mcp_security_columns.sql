-- Add security scoring columns to mcp_servers.
-- All nullable, no defaults → instant ALTER on any table size (no rewrite, no lock).
ALTER TABLE public.mcp_servers
  ADD COLUMN IF NOT EXISTS security_score   numeric,
  ADD COLUMN IF NOT EXISTS stars            integer,
  ADD COLUMN IF NOT EXISTS forks            integer,
  ADD COLUMN IF NOT EXISTS open_issues      integer,
  ADD COLUMN IF NOT EXISTS archived         boolean,
  ADD COLUMN IF NOT EXISTS is_fork          boolean,
  ADD COLUMN IF NOT EXISTS license_spdx     text,
  ADD COLUMN IF NOT EXISTS pushed_at        timestamptz,
  ADD COLUMN IF NOT EXISTS last_commit_at   timestamptz,
  ADD COLUMN IF NOT EXISTS last_release_at  timestamptz,
  ADD COLUMN IF NOT EXISTS has_releases     boolean,
  ADD COLUMN IF NOT EXISTS gh_owner         text,
  ADD COLUMN IF NOT EXISTS gh_repo          text,
  ADD COLUMN IF NOT EXISTS score_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS score_status     text,
  ADD COLUMN IF NOT EXISTS score_components jsonb;

CREATE INDEX IF NOT EXISTS mcp_servers_score_status_idx
  ON public.mcp_servers (score_status);

CREATE INDEX IF NOT EXISTS mcp_servers_security_score_idx
  ON public.mcp_servers (security_score DESC NULLS LAST);
