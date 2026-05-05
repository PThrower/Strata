# Semantic Search for content_items — Implementation Plan

Post-Show HN. Do not implement until the MCP server backlog is cleared and
runtime Phase 3/4 is stable. This is a reference plan, not a task list.

---

## Why

`search_content_items` uses Postgres full-text search (`ts_rank` on
`to_tsvector`). It requires exact keyword presence. Queries like "agentic
workflows" or "retrieval augmented generation" return zero results if those
exact tokens don't appear in integration titles or bodies.

`find_mcp_servers` already uses Voyage AI `voyage-3` embeddings + pgvector
cosine similarity, weighted by trust scores. The two tools should behave
consistently — both using semantic understanding for `use_case` / `query` input.

The v2 migration (`20260504000003`) partially addresses result ordering via
`confidence` + `source_count` weighting, but doesn't fix false negatives.
This plan fixes false negatives.

---

## Reference pattern: `mcp_servers`

| Concern | mcp_servers implementation |
|---|---|
| Column | `embedding vector(1024)` |
| Index | HNSW via pgvector |
| Embedding model | Voyage AI `voyage-3`, direct HTTP via `lib/embeddings.ts` |
| Write path | `scripts/refresh/index.ts` → embeds new entries before upsert |
| Backfill | `scripts/score-mcp-security.ts` pattern (resumable, rate-limited) |
| Query | `search_mcp_servers` RPC — cosine similarity × trust blend |
| Ranking formula | `similarity × (0.6 + 0.4 × (0.55×security + 0.45×runtime))` |
| Similarity floor | 0.15 hard filter before ranking |

All five of these have direct analogues in the `content_items` plan below.

---

## Step 1 — Migration: add embedding column

New file: `supabase/migrations/YYYYMMDD000001_content_items_embedding.sql`

```sql
-- Enable pgvector if not already enabled (it is, for mcp_servers)
-- CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE public.content_items
  ADD COLUMN embedding vector(1024);

-- HNSW index for fast approximate nearest-neighbour search.
-- ef_construction=128 and m=16 are the same values used for mcp_servers.
CREATE INDEX idx_content_items_embedding
  ON public.content_items
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 128);
```

No data changes — the column starts NULL for all existing rows. The backfill
script (Step 2) populates it.

---

## Step 2 — Backfill script

New file: `scripts/embed-content-items.ts`

Pattern: mirrors `scripts/score-mcp-security.ts` / `score-mcp-runtime.ts`.

Logic:
1. Query `content_items WHERE embedding IS NULL ORDER BY created_at ASC`
   with a configurable `BATCH_LIMIT` (default all rows; set `EMBED_LIMIT=N`
   to cap for testing).
2. For each batch of 20 rows, call `embedBatch(texts)` from `lib/embeddings.ts`
   where `text = title + '\n\n' + body` for each row.
3. `UPDATE content_items SET embedding = $1 WHERE id = $2` for each result.
4. 500ms delay between batches (same as MCP directory refresh) to respect
   Voyage AI rate limits.
5. Resumable: rows already embedded are skipped (WHERE embedding IS NULL).

Estimated cost:
- Average content item body ~200 tokens. Title ~10 tokens. Total ~210 tokens/item.
- At 50,000 items: 10.5M tokens × $0.12/1M = ~$1.26 for the full backfill.
- Re-runs are free — only unembedded rows are processed.

Run: `npx tsx --env-file=.env.local scripts/embed-content-items.ts`

---

## Step 3 — Write path: embed at insert time

File to modify: `scripts/refresh/writer.ts` → `writeContent()`

Currently inserts rows without embeddings. After this change:

1. Before inserting a chunk, call `embedBatch(texts)` where
   `text = item.title + '\n\n' + item.body` for each item.
2. Attach the resulting `number[]` to each row as the `embedding` column.
3. If the Voyage API call fails, log the error and insert the rows with
   `embedding: null` rather than failing the whole write (the backfill script
   will catch them on the next run).

The `replace_best_practices` RPC inserts best-practice rows directly via SQL.
It would need a separate update pass (or restructuring as an application-level
insert) to attach embeddings. Defer this — best practices are already ranked
by the Claude regeneration pipeline; semantic search on best_practices is less
critical than on integrations.

---

## Step 4 — New RPC: `search_content_items_semantic`

New migration: `supabase/migrations/YYYYMMDD000002_search_content_items_semantic.sql`

Ranking formula (analogous to `search_mcp_servers` v5):

```sql
similarity * (
  0.7
  + 0.15 * CASE confidence
             WHEN 'high'   THEN 1.0
             WHEN 'medium' THEN 0.5
             ELSE               0.0
           END
  + 0.15 * LEAST(source_count::float / 3.0, 1.0)
)
```

Where `similarity = 1 - (embedding <=> query_embedding)` (cosine similarity).

Hard similarity floor: 0.15 (same as `search_mcp_servers`).

Function signature mirrors the semantic MCP server search:
- Takes `query_embedding vector(1024)` as input instead of `search_query text`
- Returns same columns as `search_content_items` plus a `similarity float` column
- Accepts the same `filter_ecosystem`, `filter_category`, `user_tier` params
- Falls back gracefully: if `embedding IS NULL`, the row is excluded

---

## Step 5 — Handler updates

Files: `lib/mcp-tools.ts` and `app/api/v1/integrations/route.ts`

When `use_case` / `search_query` is provided:
1. Call `embed(use_case)` from `lib/embeddings.ts` to get a `number[]`
2. Call `supabase.rpc('search_content_items_semantic', { query_embedding: embedding, ... })`
3. Keep the existing `search_content_items` (keyword FTS) as a fallback:
   if the semantic RPC returns zero results (e.g. all embeddings still NULL
   during rollout), fall back to the keyword path.

Also: `search_ecosystem` MCP tool uses the same `search_content_items` RPC.
Update it to use the semantic RPC when a `query` is provided with no ecosystem
filter, and the hybrid keyword RPC for ecosystem-scoped queries where keyword
precision may be more appropriate.

---

## Rollout order

1. Run migration (Step 1) — adds NULL column, no downtime
2. Run backfill script (Step 2) — background job, resumable
3. Deploy write-path change (Step 3) — new items get embeddings going forward
4. Run migration (Step 4) — adds new RPC alongside existing one
5. Deploy handler change (Step 5) — switches to semantic when embeddings exist

Steps 1–3 can be done before Show HN if time permits, since they have no
user-visible effect. Steps 4–5 flip the switch and should be tested against
the backfilled corpus first.
