# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server (Turbopack)
npm run build    # production build
npm run lint     # ESLint
npm run refresh  # run content refresh pipeline (requires .env.local)
npm run mcp      # start stdio MCP transport (requires .env.local)
```

All scripts require `.env.local` — pass with `--env-file=.env.local`:

```bash
# Single-ecosystem refresh (faster than full pipeline for testing)
SLUG=cursor npx tsx --env-file=.env.local scripts/refresh-one.ts

# Backfill scripts (long-running, safe to interrupt and resume)
npx tsx --env-file=.env.local scripts/score-mcp-security.ts    # GitHub security scores (~82 min, 2179 repos)
npx tsx --env-file=.env.local scripts/score-mcp-runtime.ts     # runtime scoring (RUNTIME_LIMIT=N to cap)
npx tsx --env-file=.env.local scripts/scan-mcp-injection.ts    # injection scan backfill (~25 min)

# Maintenance / one-shot scripts
npx tsx --env-file=.env.local scripts/regen-stale-bp.ts              # regenerate stale best_practices for all ecosystems
npx tsx --env-file=.env.local scripts/reset-unparseable-runtime.ts   # requeue score=45 default rows for re-scoring
npx tsx --env-file=.env.local scripts/rescore-runtime-sample.ts      # test runtime scoring on 20 rows
npx tsx --env-file=.env.local scripts/cleanup-seed-integrations.ts   # delete null-URL seed integrations (already run)
npx tsx --env-file=.env.local scripts/diagnose-data-quality.ts       # 5-issue DB diagnostic

# Diagnostics
npx tsx --env-file=.env.local scripts/check-feeds.ts              # health-check all configured RSS feeds
npx tsx --env-file=.env.local scripts/debug-validation.ts [slug]  # debug validation pipeline for one ecosystem
```

There are no tests at this time.

## Architecture

This is a SaaS API platform built on **Next.js 16**, **Supabase** (auth + Postgres), and **Stripe** (subscriptions). It exposes AI ecosystem intelligence (best practices, news, integrations) via both a REST API (`/api/v1/*`) and an MCP server (`/mcp`).

### Auth model — two distinct surfaces

| Surface | Auth mechanism | Supabase client |
|---|---|---|
| Dashboard / user UI | Supabase session cookie | `createUserClient()` |
| Public API (`/api/v1/*`) and MCP | `X-API-Key` or `Authorization: Bearer` header | `createServiceRoleClient()` |

`lib/supabase-server.ts` exports both factories. `createServiceRoleClient()` bypasses RLS and is used everywhere the caller is already trusted (API key routes, Stripe webhooks). Never use it for user-initiated requests without validating identity first.

The dashboard page uses **both** clients intentionally: `createUserClient()` to verify the session, then `createServiceRoleClient()` for profile and `api_requests` reads (RLS would block `api_requests` for non-owners).

### Edge security gateway — `proxy.ts`

`proxy.ts` (exported as `proxy`) is the single edge gateway for the entire app. It is **not** named `middleware.ts` — Next.js 16 deprecated the `middleware` convention; only one `proxy.ts` is supported per project, and adding `middleware.ts` is silently ignored. The file also avoids importing `@supabase/ssr` to stay clear of a Turbopack deadlock.

Responsibilities (in order):

1. **Scanner-path block** — returns 404 for `/.env`, `/wp-admin`, `/.git/config`, `/phpinfo.php`, `/admin.php`, etc. Looks like a normal miss to attackers.
2. **Path-traversal block** — rejects `..`, `%2e%2e`, `%252e` in pathname with 400.
3. **For `/api/*` and `/mcp`:**
   - Rejects empty / over-long User-Agent (400)
   - Blocks mass-scanner UAs (`nuclei`, `sqlmap`, `nikto`, `masscan`, `zgrab`, `acunetix`, `nessus`, `gobuster`, `dirb`, `wpscan`, `wfuzz`, `metasploit`, `qualys`, `openvas`, `libwww-perl`, `burpcollab`) with 403
   - **Per-IP sliding-window rate limit**: 100/min for `/api/*`, 30/min for `/mcp`. Buckets keyed `<ip>|<family>` so an MCP burst doesn't starve API.
   - Content-Length pre-check: 413 for >100 KB (api) / >50 KB (mcp) before the route runs
4. **Dashboard session guard** — redirect to `/login` if no Supabase auth cookie. Optimistic check (cookie presence, not signature); routes inside `/dashboard` re-verify with `createUserClient()`.
5. **Security headers** — applied to every response: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

**Rate-limiter scope**: in-memory `Map<key, timestamps[]>` per Lambda instance. Vercel's Fluid Compute may run several instances, so a per-IP limit can drift proportionally to instance count. Vercel's edge DDoS protection handles the volumetric layer. Migrate to Upstash Redis for strict global enforcement.

`vercel.json` adds the same security headers + HSTS at the CDN level for defense-in-depth, plus `Cache-Control: no-store` on `/api/*` and `/mcp(.*)`.

`lib/security.ts` exposes `readBoundedJson<T>(request, maxBytes)` for chunked-encoding protection — used by `POST /verify-bulk` to catch requests without a `Content-Length` header.

`lib/server-timing.ts` exposes `serverTiming(t0)` — every `/api/v1/*` route attaches `Server-Timing: total;dur=Nms` to its response for latency monitoring.

### Public API pipeline (`lib/api-auth.ts`)

Two auth flows coexist. Use the right one per route:

**`authenticateRequest(req)`** — authenticated-only routes (`POST /verify-bulk`, etc.):
1. Reads `X-API-Key` or `Authorization: Bearer sk_...` header
2. Calls `consume_api_call` RPC (atomic: validates key, rolls monthly window, enforces limits, increments counter)
3. Returns `{ ok: true, profile, supabase }` or `{ ok: false, response }`

**`authenticateOrAnon(req)`** — routes that accept both authenticated and anonymous callers (`GET /mcp/verify`, `GET /mcp-servers`):
- Header present → same auth flow as above, returns `{ ok: true, mode: 'auth', profile, supabase }`
- Header absent → in-memory IP token bucket (10 req/hr per IP, per-process), returns `{ ok: true, mode: 'anon', ip, remaining, resetAt }`
- Returns `{ ok: false, response }` on rate limit or invalid key

Use `rateLimitHeaders(auth)` to get the `X-RateLimit-*` headers to attach to every response from anon-capable routes.

After auth, routes call `checkEcosystemAccess()` to gate pro-only ecosystems, then `logApiRequest()` to write to `api_requests`, then `logQueryAudit()` to write a full query audit record (params, result IDs, latency, client IP) to `api_query_log`. Anonymous callers are logged under sentinel key `'anon'` — the column is plain text with no FK, so this is schema-safe. MCP tool calls go through the same helpers in `lib/mcp-tools.ts`.

`checkEcosystemAccess()` resolves **aliases**: e.g. `claude-code` → `claudecode`, `together-ai` → `togetherai`. Aliases are stored in the `aliases text[]` column on the `ecosystems` table. Always return `access.slug` (the canonical slug) for subsequent DB queries — not the caller-supplied slug.

### Public API routes (`app/api/v1/`)

| Route | Auth | Description |
|---|---|---|
| `GET /mcp/verify` | anon or key | Single MCP server lookup by `?url=`, `?npm=`, or `?endpoint=`. **Bypasses quarantine filter** — this is the only endpoint that surfaces `is_quarantined=true` rows, because the entire point is to warn callers about dangerous servers. |
| `POST /mcp/verify-bulk` | key required | Batch lookup, up to 50 identifiers. Body: `{ identifiers: [{url?} | {npm?} | {endpoint?}][] }`. Charges `ceil(N/10)` API calls; reports via `X-Strata-Calls-Charged` header. Uses 3 parallel `IN` queries (one per identifier type) for ≤3 DB round trips regardless of N. |
| `GET /mcp-servers` | anon or key | Semantic search over MCP directory. Returns `runtime_score`, `capability_flags`, `hosted_endpoint`, `tool_count`, `runtime_freshness`. Accepts `min_runtime_score`, `exclude_capability_flags` (comma-separated), `require_hosted` filters. |
| `GET /ecosystems/[slug]/brief` | key required | Composite: best practices + news + integrations in one round trip. Three parallel Supabase queries. |
| `GET /best-practices` | key required | Best practices for an ecosystem. |
| `GET /news` | key required | News items for an ecosystem. |
| `GET /integrations` | key required | Integration items for an ecosystem. |
| `GET /search` | key required | Full-text search over content items. |

### Risk computation (`lib/risk.ts`)

Pure `computeRiskLevel(row: RiskInput)` that returns `{ level: RiskLevel, reasons: string[], trusted: boolean }`. Hierarchy (conservative — stops at first match):

1. `is_quarantined = true` OR `security_score < 20` → **critical**, `trusted: false`
2. `capability_flags` includes `shell_exec` or `dynamic_eval` → **high**, `trusted: false`
3. `capability_flags` includes `fs_write` or `arbitrary_sql` → **medium**, `trusted: false`
4. Otherwise → **low**, `trusted: true`

This is the **server-authoritative** risk signal. The `@strata-ai/sdk` ships an identical copy at `packages/sdk/src/risk.ts` so server and client never disagree. Do not change one without updating the other.

### Verify shared helpers (`lib/mcp-verify-shared.ts`)

Shared between `/mcp/verify` and `/mcp/verify-bulk`:
- `McpRow` interface + `VERIFY_SELECT_COLUMNS` constant — single source of truth for which columns to pull
- `normalizeGitHubUrl(input)` — returns `[canonical, canonical.git]` candidates for `.in('url', ...)` lookups. Lowercases owner/repo path segments (GitHub is case-insensitive; our DB stores lowercase).
- `freshnessBucket(iso)` — maps `runtime_updated_at` to `'fresh' | 'aging' | 'stale' | 'unknown'`
- `buildVerifyResult(row | null)` — constructs the full `VerifyResult` JSON shape, including risk assessment

### MCP server (`app/mcp/route.ts`)

HTTP MCP endpoint using `WebStandardStreamableHTTPServerTransport`. `GET /mcp` returns a JSON capability manifest (tools, prompts, resources). `POST /mcp` handles tool calls. Auth flows through `lib/mcp-auth.ts` (accepts both `X-API-Key` and `Authorization: Bearer` headers). A stdio transport variant lives at `scripts/mcp-stdio.ts` (`npm run mcp`).

`lib/mcp-tools.ts` exports three things, all registered identically in both the HTTP route and the stdio script:

- **`TOOL_DEFINITIONS` / `handleToolCall`** — six tools: `get_best_practices`, `get_latest_news`, `get_top_integrations`, `search_ecosystem`, `list_ecosystems`, `find_mcp_servers`.
- **`RESOURCES`** — one static resource: `strata://formatting-guide` (plain-text briefing format guide for agents).
- **`PROMPTS`** — three prompt templates: `ecosystem_briefing`, `cross_ecosystem_compare`, `agent_stack_review`. Each prompt's `arguments` array drives both the MCP argsSchema (Zod) and the `{placeholder}` substitution in its `template` string.

All tool results include an epistemic notice and freshness envelope (`content_age_hours`, `data_freshness` from `lib/freshness.ts`). Quarantined items (`is_quarantined = true`) are filtered from all tool responses.

### x402 payment endpoint verification

Trust scoring for autonomous-payment HTTP endpoints. The same scoring rigor that grades MCP servers, applied to x402 endpoints — SSL validity, domain age, payment amount reasonableness, well-formed 402 response.

- **Table** `x402_endpoints` — `url` (unique), `domain`, `security_score` (0–100), `is_quarantined`, `payment_amount_usd`, `payment_currency`, `payment_network`, `declared_capability`, `ssl_valid`, `domain_age_days`, `flags text[]`, `raw_402_response jsonb`, `first_seen_at`, `last_checked_at`. RLS: anyone authenticated can SELECT; writes are service-role only.
- **Route** `GET /api/v1/x402/verify?url=…` — same auth shape as MCP verify (`authenticateOrAnon`); writes one ledger row per call.
- **MCP tool** `verify_payment_endpoint(url)` — same scoring path, returns the full trust assessment as JSON.
- **24-hour cache** — repeat calls within the window return the stored row without re-fetching the endpoint.

Scoring (0–100): +20 ssl_valid, up to +25 domain_age_days, up to +15 payment_amount_usd (smaller is safer), +15 well-formed 402, +10 first_seen older than 7 days, +15 if zero flags else −10/flag. Clamped to [0, 100].

Risk levels (conservative early-exit, mirrors `lib/risk.ts`):
- `critical` — `is_quarantined` OR `security_score < 20`
- `high`     — flag `ssl_invalid` OR `known_fraud`
- `medium`   — flag `drain_risk` OR `mismatched_capability`
- otherwise `low`

Flags written by the verifier (in `lib/x402-verifier.ts`):
- `unverified_domain` — domain age < 30d or WHOIS unavailable. Always set in v1 (no WHOIS lookup yet — `domain_age_days` is always null).
- `ssl_invalid`       — fetch threw a TLS cert error.
- `no_payment_details` — non-402 response, fetch error, timeout (5s), or unparseable 402 body.
- `drain_risk`        — `payment_amount_usd > 1.00`.
- `known_fraud`       — domain on a known fraud list. v1 stub: never set.
- `mismatched_capability` — reserved for a future cross-check between declared and observed capabilities. v1: never set.

### Agent Identity & Credentialing

Per-agent cryptographic identities issued by Strata. MCP servers and x402 endpoints verify the identity before honouring tool calls.

- **Table** `agent_identities` — `agent_id` (`agt_` + 32 hex, unique), `name`, `description`, `capabilities text[]` (e.g. `['mcp:invoke','x402:pay']`), `metadata jsonb`, `expires_at` (default `created_at + 1 year`), `last_verified_at`, `revoked_at`, `revocation_reason`. RLS: owner read-only via `auth.uid() = profile_id`; all writes are service-role only.
- **Library** `lib/agent-credentials.ts` — `signCredential(identity)` → JWT, `verifyCredential(jwt)` → claims or error, `getJwks()` → JWKS doc. Uses `jose` with EdDSA (Ed25519). Lazy key caching per process.
- **Customer-facing routes** (Supabase session cookie auth):
  - `POST /api/v1/agents` — create. Body: `{ name, capabilities?, expires_in_days?, description?, metadata? }`. Returns the JWT in `credential` field **once** — never stored, never re-derivable. Allowed capabilities: `mcp:invoke`, `x402:pay`.
  - `GET /api/v1/agents` — list owner's identities (no JWTs).
  - `GET /api/v1/agents/[id]` — single detail (no JWT).
  - `POST /api/v1/agents/[id]/revoke` — idempotent. Sets `revoked_at` and `revocation_reason`.
- **Public-facing routes** (no auth, IP-rate-limited):
  - `GET /.well-known/jwks.json` — JWKS doc with Strata's EdDSA public key. 5-min cache. Lets MCP servers verify JWTs offline.
  - `POST /api/v1/agents/verify` — body `{ credential }`. Verifies signature, then live revocation check by `jti -> agent_identities.id`. Returns `{ valid, agent_id, profile_id, name, capabilities, expires_at }` or `{ valid: false, error, message }`. Bumps `last_verified_at` fire-and-forget.
- **MCP tool** `verify_agent_credential(credential)` — same scoring path as `/api/v1/agents/verify`, returns `{ valid, ... }` JSON. Lets MCP servers that already speak Strata MCP check identities without an extra HTTP integration.
- **Dashboard** `/dashboard/agents` — list / create / revoke. One-time JWT reveal modal after creation (warning + copy button + select-all). Mirror of the Ledger page pattern with the Glass aesthetic on the reveal modal.

JWT shape:
- Header: `{ alg: 'EdDSA', typ: 'JWT', kid: 'strata-2026-01' }`
- Claims: `iss=https://strata.dev`, `aud=mcp`, `sub=<agent_id>`, `jti=<agent_identities.id>`, `iat`, `exp`, `profile_id`, `name`, `capabilities[]`
- Presented as `Authorization: Bearer <jwt>`. Optional `X-Strata-Agent-Id` convenience header mirrors `JWT.sub`.

Verification flow for an MCP server:
1. Decode header, fetch `/.well-known/jwks.json` (HTTP cached 5 min), pick key matching `kid`.
2. Verify signature with EdDSA + that public key.
3. Validate claims: `iss`, `aud`, `exp > now`, small `iat` skew.
4. (Optional, for writes/payments) `POST /api/v1/agents/verify` for live revocation check; cache ~30s.
5. Authorize by intersecting required scope with `capabilities[]` (e.g. require `x402:pay` before honouring a paid tool call).

Note: `agent_activity_ledger.agent_id` is intentionally free-form text with no FK to `agent_identities.agent_id` so anonymous and pre-identity ledger rows still work. When an identity is in use, the same `agt_<hex>` value appears in both columns.

### Data Lineage Tracking

Explicit agent-declared data flows: "I read from Server A and sent it to Server B." Risk signals are denormalized at write time so the dashboard never joins `mcp_servers`.

- **Table** `data_lineage_flows` — `profile_id`, `agent_id`, `session_id` (caller-supplied run/trace ID), `source_server_url`, `source_tool`, `source_mcp_server_id` (FK to mcp_servers, resolved at insert), `dest_server_url`, `dest_tool`, `dest_mcp_server_id`, `source_capability_flags text[]`, `dest_capability_flags text[]`, `dest_has_net_egress boolean`, `data_tags text[]` (caller-reported: `pii`, `credentials`, `financial`, `internal`), `risk_level` (computed: low/medium/high/critical), `ledger_entry_ids uuid[]` (optional cross-refs to agent_activity_ledger). RLS: owner-read-only; all writes are service-role only. No append-only trigger (unlike the ledger).
- **Library** `lib/lineage.ts` — `computeLineageRisk(destFlags, dataTags, isDestQuarantined)` pure function; `shortServerLabel(url)` for display.
- **Risk model** (destination-only — source taint is a Phase 3 concept):
  - `critical` — dest quarantined, or dest has `shell_exec`/`dynamic_eval` + data_tags contain `pii`/`credentials`
  - `high`     — dest has `net_egress` + data_tags contain `pii`/`credentials`
  - `medium`   — dest has `net_egress`
  - `low`      — otherwise
- **Routes** (API key auth, same as all other `/api/v1/*` routes):
  - `POST /api/v1/lineage` — record a flow. Body: `{ source_server, dest_server, agent_id?, session_id?, source_tool?, dest_tool?, data_tags?, ledger_entry_ids? }`. Resolves both URLs against `mcp_servers` (by `hosted_endpoint` then `url`), computes risk, inserts row.
  - `GET /api/v1/lineage` — list flows. Params: `session_id`, `agent_id`, `risk_level`, `dest_has_net_egress=true`, `limit` (max 200), `before` (ISO cursor).
  - `GET /api/v1/lineage/sessions` — distinct sessions with stats (flow count, highest risk, distinct server count, time range). Calls `get_lineage_sessions(profile_id)` Postgres RPC.
- **MCP tool** `track_data_flow(source_server, dest_server, session_id?, data_tags?)` — records a lineage flow via the MCP interface.
- **Dashboard** `/dashboard/lineage` — flow table with source→dest arrow, session filter (click a session_id), egress-only filter, session chain header (Server A → B → C), and a 7-day risk banner when net-egress flows are present.
- **`session_id` contract**: caller-supplied, opaque string. Strata does not issue session IDs — pass a LangChain `run_id`, LlamaIndex trace ID, or any UUID your application generates. Sessions are just a `GROUP BY session_id` — no session table.

### Database schema (Supabase Postgres)

Key tables in `supabase/migrations/`:
- **`profiles`** — one row per auth user; holds `api_key` (`sk_` + 32 hex chars), `tier`, `calls_used`, `calls_reset_at`, Stripe IDs, `lifetime_pro boolean`. Auto-created by `handle_new_user()` trigger. `lifetime_pro = true` marks founder accounts (one-time $100 purchase); the webhook uses this to skip downgrade on `customer.subscription.deleted`. `REVOKE UPDATE (lifetime_pro)` from `authenticated` — only the webhook (service role) may set it.
- **`ecosystems`** — catalog of supported ecosystems; `available_on_free` gates free-tier access (5 core ecosystems: `claude`, `openai`, `gemini`, `langchain`, `ollama`); `aliases text[]` enables slug resolution (e.g. `claude-code` → `claudecode`).
- **`content_items`** — content records (`best_practices`, `news`, `integrations`) keyed by `ecosystem_slug`. Has `is_quarantined` and `injection_risk_score` safety columns. Source integrations always have a non-null `source_url`; best_practices have `source_url = null` by design (AI-generated).
- **`api_requests`** — append-only usage log; no RLS, service role only. `api_key` is plain text (no FK) — anonymous traffic is logged under sentinel `'anon'`.
- **`api_query_log`** — full query audit records (params, result IDs, latency, client IP hashed via HMAC); service role only.
- **`mcp_servers`** — MCP directory sourced from `awesome-mcp-servers`. Key columns:
  - `embedding vector(1024)` — Voyage AI semantic search
  - `security_score` (0–100) — from GitHub signals
  - `runtime_score` (0–100) — from static analysis + optional live probes
  - `capability_flags text[]` — e.g. `['shell_exec', 'fs_write', 'net_egress']`
  - `hosted_endpoint`, `tool_count`, `tool_names`, `runtime_updated_at`, `runtime_status`
  - `is_quarantined`, `injection_risk_score`
  - `npm_package`, `pypi_package` — for package-based lookup
  - Searched via `search_mcp_servers(...)` RPC (v5): `similarity * (0.6 + 0.4 * (0.55*security + 0.45*runtime))` with a hard 0.15 similarity floor — results below this threshold are excluded before ranking to prevent high-scoring but semantically unrelated servers from surfacing.
- **`mcp_runtime_probes`** — per-probe log for runtime scoring backfill (toolCount, latency, error, etc.)

RLS is on for `profiles`, `ecosystems`, `content_items`. Sensitive `profiles` columns (`tier`, `calls_used`, `api_key`, Stripe IDs) have `REVOKE UPDATE` from `authenticated` — all writes to these must go through service-role routes or webhooks.

Full-text search is implemented as a Postgres RPC: `search_content_items(search_query, filter_ecosystem, filter_category, user_tier)`.

Embeddings use **Voyage AI** (`voyage-3`, 1024 dimensions) via direct HTTP fetch in `lib/embeddings.ts` — no npm package, just `fetch` with `Authorization: Bearer ${VOYAGE_API_KEY}`.

### Content refresh pipeline (`scripts/refresh/`)

`npm run refresh` runs `scripts/refresh/index.ts` — a Node script (not a Next.js route) that populates `content_items`. For each ecosystem in `ecosystems.ts`:

1. `fetchAllSources()` — scrapes RSS feeds, GitHub repos, subreddits, and `integrationsRepo` (if set) → raw items
2. `urlDedup()` — filters items whose `source_url` already exists in the DB
3. `validateBatch()` — calls Claude (`claude-sonnet-4-6`) in batches of 20 to score relevance, fix titles/bodies, reclassify categories, and **detect injection content**; low-confidence and quarantined items are separated
4. `dedupeNearDuplicates()` — a second Claude pass to remove near-duplicate stories within the batch
5. `writeContent()` — inserts validated items in chunks of 50; sets `is_quarantined` flag on flagged items
6. `bestPracticesAreStale()` — checks if any `best_practices` rows exist newer than 3 days. If stale, always regenerates — BP generation uses a static prompt and is **independent of source fetch results**. Uses Haiku when no new content was written (off-peak), Sonnet otherwise.

The BP regen runs unconditionally when stale. The old pattern of gating it on `fetched > 0` was removed — ecosystems with quiet feeds (no RSS, low-activity GitHub) would never regenerate otherwise.

After ecosystem processing, `refreshMcpDirectory()` runs:
1. Fetches `awesome-mcp-servers` README, parses entries
2. Embeds new entries via Voyage AI (batch 20, 500ms delay between batches)
3. Runs two-layer injection scan on each new entry: Layer 1 regex (`lib/injection-scanner.ts`) + Layer 2 Claude Haiku semantic check
4. Upserts with `is_quarantined` flag
5. Scores up to 200 newly-inserted rows via `scripts/refresh/security-score.ts` (3 GitHub API calls per repo, rate-limited to ~80 req/min)

`writer.ts` creates its own Supabase client directly (cannot import `lib/supabase-server.ts` which pulls in `next/headers`).

**Ecosystem configuration (`scripts/refresh/ecosystems.ts`)**: Each ecosystem has:
- `rssFeeds: string[]` — RSS feed URLs
- `subreddits: string[]` — subreddit names (fetched via Reddit JSON API, filtered to score ≥ 10)
- `githubRepos: string[]` — `owner/repo` strings for GitHub release fetching
- `integrationsRepo?: string` — optional GitHub repo whose README is scraped for integration content. The `fetchIntegrations()` function splits the README on `## ` headings and keeps sections whose body includes the ecosystem slug. `claude` uses `punkpeye/awesome-mcp-servers`; `cursor` uses `PatrickJS/awesome-cursorrules`.
- `bestPracticesPrompt: string` — static prompt for Claude-generated BP items

**`scripts/refresh-one.ts`** — single-ecosystem refresh for testing. Run as `SLUG=cursor npx tsx --env-file=.env.local scripts/refresh-one.ts`. Useful for testing ecosystem-specific pipeline changes without the full 21-ecosystem run.

### MCP directory & security scoring

`mcp_servers` is populated from `awesome-mcp-servers` and scored with two independent signals:

**Security score (0–100)** — from GitHub static signals:
- Stars (log-scale, max +25), last commit age (±15), release discipline (+10), license permissiveness (±10), archived/fork penalties (-25/-10)
- Backfill: `npx tsx --env-file=.env.local scripts/score-mcp-security.ts` — resumable via `score_updated_at`; re-run for `error_rate_limited` rows. `error_transient` rows are **not** retried (dead repos — treat as permanent).

**Runtime score (0–100)** — from static source analysis + optional live probes:
- Base score 50. Adjustments: `toolPoints` (-5 to +8 by tool count/diversity), `capabilityPenalty` (up to -71 for shell_exec, dynamic_eval, etc.), `injectionPenalty` (0 to -40), `probeBonus` (0 to +20 for live probe success), `hostedBonus` (+4 if hosted endpoint known).
- `tool_count = null` (couldn't parse source) → -5 "unparsed" penalty. Servers stuck at score 45 = base 50 - 5 unparsed + no other signals.
- Static analyzer (`scripts/refresh/runtime-static.ts`) fetches README + manifests + up to 8 ranked source files. Picks `.ts`, `.tsx`, `.js`, `.mjs`, `.cjs`, `.py`, `.go`, `.rs` files. Tool extraction patterns: JS/TS `server.tool(name, {description})`, Python `@mcp.tool()` decorator with docstring, Python `Tool(name=, description=)`, and JS/TS `{ name: '...', description: '...' }` object literals (the canonical `setRequestHandler(ListToolsRequestSchema, ...)` shape).
- Backfill: `npx tsx --env-file=.env.local scripts/score-mcp-runtime.ts` — set `RUNTIME_LIMIT=N` to cap. Rows with `runtime_status = null` are scored first; `error_permanent` rows are skipped.
- Use `scripts/reset-unparseable-runtime.ts` to clear `runtime_updated_at` for stuck-at-45 rows so the daily refresh re-scores them with the current parser.

**Injection scan backfill**: `npx tsx --env-file=.env.local scripts/scan-mcp-injection.ts` — Layer 1 regex + Layer 2 Haiku + Layer 3 Sonnet extended-thinking (only for borderline cases). All Claude calls have 30s timeout.

**`GITHUB_TOKEN`** is optional but required for authenticated rate limit (5,000/hr vs 60/hr).

### Agent safety layer

- **`lib/injection-scanner.ts`** — fast regex Layer-1 scanner for prompt injection patterns; returns `{ score: 0–10, hits: string[] }`
- **`lib/freshness.ts`** — wraps query results with `content_age_hours` and `data_freshness` (`fresh` / `recent` / `stale`) based on `published_at`
- **`lib/embeddings.ts`** — `embed(text)` and `embedBatch(texts[])` via Voyage AI HTTP API; never import the `voyageai` npm package (its ESM build is broken in Turbopack)
- Quarantined items (`is_quarantined = true`) are written to the DB but **never returned** by any API route or MCP tool — except `GET /mcp/verify`, which intentionally surfaces them so callers know a server is dangerous
- All API routes emit a `logQueryAudit()` record with full params, result IDs, latency, and client IP to `api_query_log`

### SDK and GitHub Action (external repos)

The public SDK lives in **`github.com/PThrower/strata-sdk`** (npm: `@strata-ai/sdk@0.1.2`). The GitHub Action Marketplace listing lives in **`github.com/PThrower/strata-mcp-check`** (`uses: PThrower/strata-mcp-check@v1`).

**Important naming quirk:** the `strata` package name on npm is taken by an unrelated web framework. The CLI must be invoked as `npx @strata-ai/sdk scan` or `npx @strata-ai/sdk verify`. After `npm install -g @strata-ai/sdk` the bare `strata` binary works.

The SDK ships an identical copy of `lib/risk.ts` at `packages/sdk/src/risk.ts`. If you change the risk-level computation logic here, update the SDK's copy in the same PR. The two files must stay byte-for-byte equivalent in their logic.

### Stripe integration

- `POST /api/stripe/checkout` — creates a Checkout session; sets `client_reference_id` to the user's profile ID so the webhook can match it.
- `POST /api/stripe/webhook` — handles `checkout.session.completed` (upgrades to `pro`) and `customer.subscription.deleted` (downgrades to `free`). Detects founder purchases via `session.mode === 'payment'` — these set `lifetime_pro = true` and are never downgraded. Requires raw body bytes for signature verification — do not call `.json()` before `stripe.webhooks.constructEvent`.
- `POST /api/stripe/portal` — creates a Billing Portal session for existing customers.
- `GET /founder` (`app/founder/route.ts`) — founder checkout redirect. Requires the user to be signed in (redirects to `/signup` if not), then issues a 303 redirect to the Stripe Payment Link with `client_reference_id` and `prefilled_email` appended. Without this route, founder purchases via a bare Stripe link had no profile mapping and silently failed to upgrade the account.

### Auth pages (`app/(auth)/`)

Login, signup, forgot-password, and reset-password pages all use the `useActionState` hook with Server Actions in `app/actions/auth.ts`. Password strength is enforced both client-side (live `PasswordHint` component) and server-side (`PASSWORD_REGEX`). The reset flow uses Supabase `resetPasswordForEmail()` with `redirectTo: ${NEXT_PUBLIC_APP_URL}/reset-password`; the reset page calls `updateUser({ password })` which works because Supabase sets the session automatically from the email link.

`app/auth/callback/route.ts` — Supabase email-confirmation and OAuth callback handler. Exchanges the `code` query param for a session via `exchangeCodeForSession`. Without this route, email-confirmation links 404 and new users cannot verify their accounts.

### Docs pages

Two separate docs surfaces:

- **`/docs`** — Full API & MCP reference (`app/docs/page.tsx`). A standalone `'use client'` page with its own sidebar nav, right code panel (syntax-highlighted, language-switching), and MCP client tab switcher. Does **not** use the marketing layout. Covers authentication, all REST endpoints with parameter/response tables, error codes, code examples (curl / Python / JS), and MCP server connection guides.
- **`/docs/sdk`** — SDK reference (`app/(marketing)/docs/sdk/page.tsx`). Uses the marketing layout + Glass/space-backdrop design system. Covers `@strata-ai/sdk`, CLI, GitHub Action, trust signals, capability flags, and error handling. Uses `<CodeBlock>` from `_components/CodeBlock.tsx`. Action YAML references `PThrower/strata-mcp-check@v1`.

**Nav links** in `app/(marketing)/layout.tsx`:
- `docs` → `/docs` (API/MCP reference)
- `sdk` → `/docs/sdk` (SDK reference)

Both links appear in the header nav and in the footer chip row.

**Important**: `app/(marketing)/docs/` and `app/docs/` are separate directories. Route groups like `(marketing)` are transparent — do not create a `page.tsx` inside `app/(marketing)/docs/` as it would conflict with `app/docs/page.tsx`.

### Environment variables required

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRO_PRICE_ID
NEXT_PUBLIC_APP_URL
ANTHROPIC_API_KEY        # refresh pipeline + injection scanning
VOYAGE_API_KEY           # mcp-directory embeddings (voyage-3, direct HTTP fetch)
GITHUB_TOKEN             # optional but needed for 5000/hr GitHub rate limit (scoring backfill)
ADMIN_EMAIL              # email address that gets admin dashboard access
AUDIT_HASH_PEPPER        # HMAC pepper for api_query_log IP/key hashing (warn-only if missing)
LEDGER_SIGNING_KEY       # HMAC-SHA256 key for signing agent_activity_ledger rows.
                         # Generate: openssl rand -hex 32
                         # Warn-only if missing (rows insert with signature=null).
                         # The HMAC covers ALL persisted columns via canonical JSON
                         # (stableStringify with sorted keys). Use verifyLedgerRow(row)
                         # from lib/ledger.ts to verify a row's integrity at audit time.
                         # NOTE: rows created before 2026-05-07 used a narrower HMAC input
                         # (id|profile_id|tool_called|created_at only) — those rows return
                         # false from verifyLedgerRow and should be treated as "unverifiable"
                         # (pre-fix), not "tampered".
STRATA_AGENT_SIGNING_KEY # Ed25519 private key (PKCS#8 PEM) for signing agent identity JWTs.
                         # Generate:
                         #   openssl genpkey -algorithm Ed25519 -out strata-agent-private.pem
                         #   cat strata-agent-private.pem   # → paste as STRATA_AGENT_SIGNING_KEY
                         # Required. POST /api/v1/agents and the MCP verify_agent_credential
                         # tool will return 503 if this is unset.
STRATA_AGENT_PUBLIC_KEY  # Corresponding Ed25519 public key (SubjectPublicKeyInfo PEM).
                         # Generate (from the private key above):
                         #   openssl pkey -in strata-agent-private.pem -pubout -out strata-agent-public.pem
                         #   cat strata-agent-public.pem    # → paste as STRATA_AGENT_PUBLIC_KEY
                         # Required. GET /.well-known/jwks.json and POST /api/v1/agents/verify
                         # return 503 if this is unset.
                         # Key rotation: increment kid in lib/agent-credentials.ts (KEY_ID constant),
                         # add the new JWK to the JWKS response, keep the old one for existing tokens.
```

## Brand & design system

### Color tokens (CSS custom properties in `app/globals.css`)

Two token sets coexist: light/dark dashboard tokens (`--background`, `--foreground`, `--border`, `--muted-foreground`) and the fixed marketing/product space palette:

| Token | Value | Usage |
|---|---|---|
| `--bg-0` | `#05060d` | Deepest space background base |
| `--bg-1` | `#0a0d1a` | Mid space tone |
| `--bg-2` | `#131831` | Lit nebula tone |
| `--emerald-deep` | `#1f5238` | Darkest emerald |
| `--emerald` | `#2d6a4f` | Brand primary |
| `--emerald-bright` | `#3d8a65` | API row left border, interactive accents |
| `--emerald-glow` | `#5fb085` | Italic gradient, return types, check icons, focus ring, live dot |
| `--emerald-light` | `#9be0bd` | Light emerald highlight |
| `--ink` | `#ffffff` | Primary text |
| `--ink-soft` | `rgba(255,255,255,0.84)` | Default body text on dark backgrounds |
| `--ink-muted` | `rgba(255,255,255,0.62)` | Secondary body text, nav links |
| `--ink-faint` | `rgba(255,255,255,0.42)` | Eyebrows, params, meta labels |
| `--hair` / `--rule` | `rgba(255,255,255,0.10)` | Dividers (both defined, same value) |
| `--hair-strong` | `rgba(255,255,255,0.20)` | Stronger dividers |

### Typography

- **Display / headlines**: `var(--font-serif)` = `ui-rounded, system-ui, -apple-system, sans-serif` (SF Pro Rounded on Apple). Weight 500 for h1, 400 for h2+.
- **Body / UI**: `var(--font-sans)` = Inter → Geist Sans → system. Use `font-feature-settings: "ss01", "cv11", "calt"`.
- **Code / labels**: `var(--font-mono)` = `ui-monospace, "SF Mono", Menlo` → Geist Mono.
- Brand wordmark: `var(--font-serif)` 22px, `letter-spacing: 0.18em`, **"S" uppercase, "trata" lowercase** — preserve exactly.
- Hero h1: 72px / weight 500 / line-height 1.02 / tracking -0.025em.
- Section h2: 36px / weight 400.

### Shared UI primitives (`components/ui/`)

Do not recreate these inline — always import them:

| Component | Import | Props |
|---|---|---|
| `<Glass>` | `@/components/ui/glass` | `shimmer?`, `as?`, `className?`, `style?` |
| `<Btn>` | `@/components/ui/button` | `variant` (`emerald\|ghost\|white\|outline`), `href?`, `arrow?` |
| `<LiveBadge>` | `@/components/ui/live-badge` | none |
| `<SectionHeading>` | `@/components/ui/section-heading` | `title`, `meta?` |
| `<SpaceBackdrop>` | `@/components/ui/space-backdrop` | none (renders `.mkt-space` layers) |

These wrap the CSS classes in `globals.css` (`glass`, `shimmer`, `mkt-btn`, `btn-{variant}`, etc.). All visual logic stays in CSS. `SpaceBackdrop` is mounted in `app/layout.tsx` (root layout) so it applies globally — no need to add it per-page.

### Glass primitive

`.glass` class provides the frosted panel treatment. Content must be wrapped or `.glass > *` automatically gets `position: relative; z-index: 3`. Add `.shimmer` for hover sweep effect. Key properties: `backdrop-filter: blur(28px) saturate(190%)`, faint emerald corner cast, `::after` top specular sheen.

### Design rules

- Tool/method rows: `border-left: 2px solid var(--emerald-bright)` — never cards.
- Pricing: feature comparison rows with hairline `border-top` — never bullet lists.
- Focus ring: `outline: 2px solid var(--emerald-glow); outline-offset: 3px` — globally applied in `globals.css`.
- All decorative animation gated by `@media (prefers-reduced-motion)`.
- No component libraries (no shadcn, MUI, etc.).
- `proxy.ts` not `middleware.ts` (Next.js 16 Turbopack convention).
