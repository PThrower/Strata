-- search_mcp_servers v5: add a hard similarity floor.
--
-- v4 ranks: similarity * (0.6 + 0.4 * (0.55*security + 0.45*runtime))
-- The trust blend is correct in principle, but with no minimum-similarity
-- constraint a server with similarity 0.17 from an unrelated category could
-- still surface in the top results when its security/runtime scores were
-- strong. Reviewers searching "database" got telegram and reddit-research
-- bots returned because they happened to score 70+ on security.
--
-- v5 keeps the same ranking blend but filters out anything below 0.15
-- similarity outright. Empirically tunes well: legitimate matches start at
-- ~0.20+ for our embedding model (voyage-3); 0.15 buffers a bit.

DROP FUNCTION IF EXISTS public.search_mcp_servers(vector, text, int, numeric, numeric, text[], boolean);

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
    AND (1 - (embedding <=> query_embedding)) >= 0.15
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
