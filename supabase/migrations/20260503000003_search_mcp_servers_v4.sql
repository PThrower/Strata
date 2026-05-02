-- search_mcp_servers v4: blend security_score + runtime_score in ranking;
-- expose runtime fields; add capability-flag exclusion + hosted-only filter.
--
-- v3 ranked: similarity * (0.5 + 0.5 * security_score/100)
-- v4 ranks:  similarity * (0.6 + 0.4 * (0.55*security + 0.45*runtime))
-- Floor raised to 0.6 — two trust signals give more resolution, so similarity
-- stays primary even as trust dimensions cluster.

DROP FUNCTION IF EXISTS public.search_mcp_servers(vector, text, int, numeric);

CREATE OR REPLACE FUNCTION public.search_mcp_servers(
  query_embedding          vector(1024),
  filter_category          text     DEFAULT NULL,
  match_count              int      DEFAULT 5,
  min_security_score       numeric  DEFAULT 30,
  min_runtime_score        numeric  DEFAULT 0,
  exclude_capability_flags text[]   DEFAULT '{}',
  require_hosted           boolean  DEFAULT false
)
RETURNS TABLE (
  id                  uuid,
  name                text,
  description         text,
  url                 text,
  category            text,
  tags                text[],
  similarity          float,
  security_score      numeric,
  runtime_score       numeric,
  capability_flags    text[],
  hosted_endpoint     text,
  tool_count          integer,
  stars               integer,
  archived            boolean,
  runtime_updated_at  timestamptz
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id, name, description, url, category, tags,
    1 - (embedding <=> query_embedding) AS similarity,
    security_score, runtime_score, capability_flags, hosted_endpoint,
    tool_count, stars, archived, runtime_updated_at
  FROM public.mcp_servers
  WHERE embedding IS NOT NULL
    AND coalesce(is_quarantined, false) = false
    AND score_status IS DISTINCT FROM 'pending_review'
    AND coalesce(archived, false) = false
    AND (filter_category IS NULL OR category = filter_category)
    AND (security_score IS NULL OR security_score >= min_security_score)
    AND (runtime_score  IS NULL OR runtime_score  >= min_runtime_score)
    AND (cardinality(exclude_capability_flags) = 0
         OR capability_flags IS NULL
         OR NOT (capability_flags && exclude_capability_flags))
    AND (require_hosted = false OR hosted_endpoint IS NOT NULL)
  ORDER BY
    (1 - (embedding <=> query_embedding))
    * (0.6 + 0.4 * (
        0.55 * coalesce(security_score, 50) / 100.0
      + 0.45 * coalesce(runtime_score,  50) / 100.0
    ))
    DESC
  LIMIT match_count;
$$;
