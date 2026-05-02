-- Replace search_mcp_servers with a security-aware version.
-- Ranking: multiplicative blend — similarity stays primary, security score modulates.
-- Unscored rows (non-GitHub) get a neutral 50/100 weight so they aren't penalised.
-- Archived repos are hidden by default regardless of score.
DROP FUNCTION IF EXISTS public.search_mcp_servers(vector, text, int);

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
    AND (filter_category IS NULL OR category = filter_category)
    AND (security_score IS NULL OR security_score >= min_security_score)
    AND coalesce(archived, false) = false
  ORDER BY
    (1 - (embedding <=> query_embedding))
    * (0.5 + 0.5 * coalesce(security_score, 50) / 100.0)
    DESC
  LIMIT match_count;
$$;
