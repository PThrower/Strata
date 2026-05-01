-- Enable pgvector for semantic similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- MCP server directory (sourced from awesome-mcp-servers and glama)
CREATE TABLE public.mcp_servers (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  description text,
  url         text,
  category    text,
  source      text        NOT NULL DEFAULT 'awesome-mcp-servers',
  tags        text[]      NOT NULL DEFAULT '{}',
  embedding   vector(1024),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Partial unique index: deduplicate by URL, allow multiple NULL urls
CREATE UNIQUE INDEX mcp_servers_url_idx ON public.mcp_servers (url)
  WHERE url IS NOT NULL;

-- IVFFlat approximate nearest-neighbor index (cosine distance)
CREATE INDEX mcp_servers_embedding_idx ON public.mcp_servers
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- RLS: mcp_servers is read-only via service role (no user-owned rows)
ALTER TABLE public.mcp_servers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role full access" ON public.mcp_servers
  USING (true)
  WITH CHECK (true);

-- Semantic similarity search RPC
CREATE OR REPLACE FUNCTION public.search_mcp_servers(
  query_embedding vector(1024),
  filter_category text DEFAULT NULL,
  match_count     int  DEFAULT 5
)
RETURNS TABLE (
  id          uuid,
  name        text,
  description text,
  url         text,
  category    text,
  tags        text[],
  similarity  float
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
    1 - (embedding <=> query_embedding) AS similarity
  FROM public.mcp_servers
  WHERE embedding IS NOT NULL
    AND (filter_category IS NULL OR category = filter_category)
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
