-- Add injection safety columns to mcp_servers.
-- injection_risk_score: Layer 1+2 scan result (0–10, NULL = not yet scanned)
-- is_quarantined: true means excluded from all search results
-- injection_scanned_at: timestamp of last scan (used by backfill to skip recent rows)

ALTER TABLE public.mcp_servers
  ADD COLUMN injection_risk_score smallint,
  ADD COLUMN is_quarantined boolean NOT NULL DEFAULT false,
  ADD COLUMN injection_scanned_at timestamptz;

CREATE INDEX idx_mcp_servers_quarantine
  ON public.mcp_servers(is_quarantined)
  WHERE is_quarantined = true;

CREATE INDEX idx_mcp_servers_not_scanned
  ON public.mcp_servers(id)
  WHERE injection_scanned_at IS NULL;

-- Replace search_mcp_servers to unconditionally exclude quarantined servers.
-- The filter is inside the RPC so it cannot be bypassed by callers.
DROP FUNCTION IF EXISTS public.search_mcp_servers(vector, text, int, numeric);

CREATE OR REPLACE FUNCTION public.search_mcp_servers(
  query_embedding    vector(1024),
  filter_category    text    DEFAULT NULL,
  match_count        int     DEFAULT 5,
  min_security_score numeric DEFAULT 30
)
RETURNS TABLE (
  id             uuid,
  name           text,
  description    text,
  url            text,
  category       text,
  tags           text[],
  similarity     float,
  security_score numeric,
  stars          integer,
  archived       boolean
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    name,
    description,
    url,
    category,
    tags,
    1 - (embedding <=> query_embedding)                       AS similarity,
    security_score,
    stars,
    archived
  FROM public.mcp_servers
  WHERE embedding IS NOT NULL
    AND coalesce(is_quarantined, false) = false
    AND (filter_category IS NULL OR category = filter_category)
    AND (security_score IS NULL OR security_score >= min_security_score)
    AND coalesce(archived, false) = false
  ORDER BY
    (1 - (embedding <=> query_embedding))
    * (0.5 + 0.5 * coalesce(security_score, 50) / 100.0)
    DESC
  LIMIT match_count;
$$;
