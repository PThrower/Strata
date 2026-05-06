# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server (Turbopack)
npm run build    # production build
npm run lint     # ESLint
npm run refresh  # run full content refresh pipeline (requires .env.local)
npm run mcp      # start stdio MCP transport (requires .env.local)
```

Scripts outside `npm run` need `--env-file=.env.local`:

```bash
SLUG=cursor npx tsx --env-file=.env.local scripts/refresh-one.ts  # single-ecosystem refresh for testing

# Backfill scripts (long-running, safe to interrupt)
npx tsx --env-file=.env.local scripts/score-mcp-security.ts   # GitHub security scores
npx tsx --env-file=.env.local scripts/score-mcp-runtime.ts    # runtime scoring (RUNTIME_LIMIT=N to cap)
npx tsx --env-file=.env.local scripts/probe-mcp-endpoints.ts  # live HTTP probing (PROBE_LIMIT=N)
npx tsx --env-file=.env.local scripts/scan-mcp-injection.ts   # injection scan backfill

# Diagnostics
npx tsx --env-file=.env.local scripts/check-feeds.ts
npx tsx --env-file=.env.local scripts/diagnose-data-quality.ts
```

No tests exist at this time.

## Architecture

Next.js 16 + Supabase (auth + Postgres) + Stripe. Exposes AI ecosystem intelligence and MCP server trust signals via REST API (`/api/v1/*`) and a native MCP server (`/mcp`).

### Two auth surfaces — pick the right client

| Surface | Mechanism | Client |
|---|---|---|
| Dashboard UI | Supabase session cookie | `createUserClient()` |
| `/api/v1/*` and `/mcp` | `X-API-Key` or `Authorization: Bearer` | `createServiceRoleClient()` |

`createServiceRoleClient()` bypasses RLS — only use it after verifying identity. Both factories are in `lib/supabase-server.ts`. The dashboard page intentionally uses both: `createUserClient()` to verify session, `createServiceRoleClient()` for reads RLS would block.

### `proxy.ts` — the edge gateway (not `middleware.ts`)

Next.js 16 deprecated the `middleware` convention. This project uses `proxy.ts` instead. Adding a `middleware.ts` has no effect. The file avoids `@supabase/ssr` to prevent a Turbopack deadlock.

Responsibilities in order: scanner-path 404s → path-traversal 400s → per-IP rate limiting (100/min API, 30/min MCP) + scanner UA blocks + Content-Length pre-check → dashboard session redirect → security headers on all responses.

Rate limiter is in-memory per Lambda instance — not globally strict. `vercel.json` adds HSTS + `Cache-Control: no-store` on API/MCP routes at the CDN layer.

### API auth helpers (`lib/api-auth.ts`)

**`authenticateRequest(req)`** — use for authenticated-only routes. Calls `consume_api_call` RPC (atomic: validates key, rolls monthly window, increments counter). Returns `{ ok, profile, supabase }`.

**`authenticateOrAnon(req)`** — use for routes accepting both auth and anonymous. Anon callers get a 10 req/hr IP bucket. Returns `{ ok, mode: 'auth'|'anon', ... }`.

After auth: call `checkEcosystemAccess()` (resolves ecosystem aliases, gates pro-only), `logApiRequest()`, `logQueryAudit()`.

`checkEcosystemAccess()` always returns a canonical slug — never use the caller-supplied slug for subsequent DB queries.

### MCP tools (`lib/mcp-tools.ts`)

Nine tools registered in both the HTTP route and stdio script: `get_best_practices`, `get_latest_news`, `get_top_integrations`, `search_ecosystem`, `list_ecosystems`, `find_mcp_servers`, `verify_payment_endpoint`, `verify_agent_credential`, `track_data_flow`, `get_threat_feed`.

**Policy enforcement hook**: `handleToolCall` evaluates `evaluatePolicy()` immediately after auth, before any tool branch. This is the single enforcement point for the Policy Engine.

**Circuit breaker enforcement model**: Circuit breakers are advisory in `handleToolCall` — Strata surfaces `circuit_broken: true` in `mcp/verify` responses and `find_mcp_servers` results; agents enforce by not connecting. Hard blocking at the MCP tool layer is not implemented because Strata tools do not directly invoke external MCP servers. Known limitation: `find_mcp_servers` with `exclude_circuit_broken=true` ignores per-profile resets — it filters on the global `circuit_broken` flag only, erring on the side of safety. A future fix should honour per-profile bypasses from `circuit_breaker_resets`.

All tool results strip quarantined items. MCP auth (`lib/mcp-auth.ts`) accepts both `X-API-Key` and `Authorization: Bearer`.

### SSRF protection (`lib/ssrf-guard.ts`)

`assertPublicHttpsUrl(url)` — call before any outbound fetch to user-supplied URLs. Blocks private IPv4/IPv6 ranges, `*.internal` hostnames, cloud metadata endpoints. Used in `lib/x402-verifier.ts` and `lib/mcp-probe.ts`. Any new route that fetches user-supplied URLs must call this first.

### Risk computation (`lib/risk.ts`)

`computeRiskLevel(row)` → `{ level, reasons, trusted }`. Conservative hierarchy: quarantined or score < 20 → critical; `shell_exec`/`dynamic_eval` → high; `fs_write`/`arbitrary_sql` → medium; else low.

**The SDK ships an identical copy at `packages/sdk/src/risk.ts`.** Any change to risk logic must update both files in the same commit.

### Policy Engine (`lib/policy-engine.ts`)

`evaluatePolicy(supabase, ctx)` evaluates per-profile rules against a tool call context. Per-instance 30s cache keyed by `profile_id`. Call `invalidatePolicyCache(profileId)` after any policy mutation. Fails open on DB errors — a policy DB failure must never block legitimate traffic.

Conditions are ANDed. Rules run in `priority ASC`. First `block` wins; `warn` matches accumulate. `/api/v1/mcp/verify` adds an advisory `policy_verdict` field for authenticated callers but never blocks.

### Agent Activity Ledger (`lib/ledger.ts`)

`writeLedgerEntry(entry)` — HMAC-SHA256 signed using `LEDGER_SIGNING_KEY` over all persisted columns (canonical JSON, sorted keys). `verifyLedgerRow(row)` recomputes and compares. Rows before 2026-05-07 used a narrower HMAC input — they return false and should be treated as "unverifiable (pre-fix)", not tampered.

### Threat Feed (`threat_feed` table)

Written by a Postgres `AFTER UPDATE OF is_quarantined, capability_flags, security_score, injection_risk_score` trigger on `mcp_servers`. Never written by application code. Has RLS enabled with no policies for `anon`/`authenticated` — reads must go through the metered `/api/v1/threats` route (which uses `createServiceRoleClient()` and bypasses RLS). No automated prune — retained indefinitely for compliance.

### Data Lineage (`lib/lineage.ts`)

`computeLineageRisk(destFlags, dataTags, isDestQuarantined)` — destination-only risk model. The `get_lineage_sessions()` Postgres RPC uses `auth.uid()` internally (no parameter) to prevent lateral access. Call `.rpc('get_lineage_sessions')` with no args from the route.

### Agent Credentials (`lib/agent-credentials.ts`)

EdDSA (Ed25519) JWTs via `jose`. Lazy singleton key cache per process. JWT `jti` = `agent_identities.id` — used for live revocation lookups. `agent_activity_ledger.agent_id` has no FK to `agent_identities` intentionally so anonymous rows still work.

### Content refresh pipeline (`scripts/refresh/`)

`npm run refresh` → `scripts/refresh/index.ts`. Per ecosystem: fetch sources → URL dedup → Claude validation (batches of 20) → near-duplicate removal → write to DB. Best practices regenerate unconditionally when stale (3-day threshold), regardless of whether new content was fetched.

After all ecosystems: `refreshMcpDirectory()` fetches `awesome-mcp-servers`, embeds new entries via Voyage AI, runs injection scan, upserts. Then scores up to 200 new rows.

`scripts/refresh/writer.ts` creates its own Supabase client — it cannot import `lib/supabase-server.ts` because that pulls in `next/headers`.

### MCP server runtime scoring

Two independent signals on `mcp_servers`:
- **Security score** (0–100): GitHub repo signals (stars, commit recency, releases, license, archived/fork penalties)
- **Runtime score** (0–100): base 50 ± tool count/diversity ± capability flag penalties ± injection penalty ± live probe bonus (+20 max) ± hosted endpoint bonus (+4)

`tool_count = null` → -5 "unparsed" penalty → stuck at score 45 until re-scored. Use `scripts/reset-unparseable-runtime.ts` to requeue stuck rows.

Live probing (`lib/mcp-probe.ts`) POSTs JSON-RPC `initialize` + `tools/list` with a shared 5s `AbortController`. The probe runner (`scripts/probe-mcp-endpoints.ts`) only fires for rows with a non-null `hosted_endpoint`.

### Key DB constraints

- `profiles`: sensitive columns (`tier`, `calls_used`, `api_key`, Stripe IDs) have `REVOKE UPDATE` from `authenticated` — writes only through service-role routes.
- `agent_identities`: RLS owner-read, no writes from `authenticated`.
- `policies`: DB CHECK requires at least one condition; time-window fields must be set as a pair.
- `threat_feed`: RLS enabled, no `authenticated` policies, `REVOKE ALL` from `anon`/`authenticated`.
- `agent_activity_ledger`: append-only enforced by Postgres triggers (block UPDATE and DELETE).
- `data_lineage_flows`: the `get_lineage_sessions()` RPC uses `auth.uid()` internally — call with no arguments.

### Embeddings

`lib/embeddings.ts` — Voyage AI (`voyage-3`, 1024d) via direct `fetch`. Never import `voyageai` npm package — its ESM build is broken in Turbopack.

### Compliance reporting (`app/api/compliance/report/route.ts`)

`GET /api/compliance/report?format=json|csv&period=30d|90d|1y|custom&standard=soc2|iso27001`. Session cookie auth. Fetches all ledger rows for the period (50k row cap → 413 if exceeded). Spot-checks last 1,000 rows with `verifyLedgerRow()`. Fetches `profile_id`, `parameters`, `response_summary` columns (needed for HMAC — not included in output).

### Docs routes

`/docs` (`app/docs/page.tsx`) — standalone `'use client'` page, does not use the marketing layout.  
`/docs/sdk` (`app/(marketing)/docs/sdk/page.tsx`) — uses the marketing layout.  
Do not create `app/(marketing)/docs/page.tsx` — it conflicts with `app/docs/page.tsx`.

## Design system

### Color tokens (CSS custom properties, `app/globals.css`)

Marketing/product palette (fixed, not light/dark):

| Token | Value |
|---|---|
| `--bg-0` / `--bg-1` / `--bg-2` | `#05060d` / `#0a0d1a` / `#131831` |
| `--emerald-glow` | `#5fb085` — accents, focus rings, live dot |
| `--emerald-bright` | `#3d8a65` — API row left border |
| `--ink` / `--ink-soft` / `--ink-muted` / `--ink-faint` | `#fff` / 84% / 62% / 42% |
| `--hair` / `--rule` | `rgba(255,255,255,0.10)` — dividers |

Dashboard uses standard Tailwind light/dark tokens (`--background`, `--foreground`, `--border`, `--muted-foreground`).

### Typography

- Headlines: `var(--font-serif)` (`ui-rounded, system-ui`) — weight 500 for h1, 400 for h2+
- Body/UI: `var(--font-sans)` (Inter → Geist Sans)
- Code/labels: `var(--font-mono)` (`ui-monospace, "SF Mono", Menlo`)
- Brand wordmark: serif 22px, `letter-spacing: 0.18em`, **"S" uppercase "trata" lowercase** — exact
- Hero h1: 72px / 500 / line-height 1.02 / tracking -0.025em

### UI primitives (`components/ui/`)

Import these — do not recreate inline: `<Glass shimmer?>`, `<Btn variant="emerald|ghost|white|outline">`, `<LiveBadge>`, `<SectionHeading title meta?>`, `<SpaceBackdrop>` (mounted in root layout — do not add per-page).

`.glass` = `backdrop-filter: blur(28px) saturate(190%)`. Add `.shimmer` for hover sweep.

### Design rules

- API/tool rows: `border-left: 2px solid var(--emerald-bright)` — never cards
- No component libraries (no shadcn, MUI, Radix)
- All decorative animation gated by `@media (prefers-reduced-motion)`
- `proxy.ts` not `middleware.ts` — Next.js 16 Turbopack convention

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET / STRIPE_PRO_PRICE_ID
NEXT_PUBLIC_APP_URL
ANTHROPIC_API_KEY        # refresh pipeline + injection scanning
VOYAGE_API_KEY           # embeddings — direct HTTP fetch only
GITHUB_TOKEN             # optional; 5,000/hr vs 60/hr for scoring scripts
ADMIN_EMAIL
AUDIT_HASH_PEPPER        # HMAC pepper for api_query_log IP hashing
LEDGER_SIGNING_KEY       # HMAC-SHA256 for agent_activity_ledger. Generate: openssl rand -hex 32
STRATA_AGENT_SIGNING_KEY # Ed25519 private key (PKCS#8 PEM). Generate:
                         #   openssl genpkey -algorithm Ed25519 | tee strata-agent-private.pem
STRATA_AGENT_PUBLIC_KEY  # Matching SubjectPublicKeyInfo PEM.
                         #   openssl pkey -in strata-agent-private.pem -pubout
                         # Key rotation: bump KEY_ID in lib/agent-credentials.ts
```
