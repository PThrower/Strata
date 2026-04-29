# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server (uses Turbopack by default in Next 16)
npm run build    # production build
npm run lint     # ESLint
```

There are no tests at this time.

## Architecture

This is a SaaS API platform built on **Next.js 16**, **Supabase** (auth + Postgres), and **Stripe** (subscriptions).

### Auth model — two distinct surfaces

| Surface | Auth mechanism | Supabase client |
|---|---|---|
| Dashboard / user UI | Supabase session cookie | `createUserClient()` |
| Public API (`/api/v1/*`) | `X-API-Key` header | `createServiceRoleClient()` |

`lib/supabase-server.ts` exports both factories. `createServiceRoleClient()` bypasses RLS and is used everywhere the caller is already trusted (API key routes, Stripe webhooks). Never use it for user-initiated requests without validating identity first.

### Route guard — `proxy.ts` not `middleware.ts`

The session guard lives in `proxy.ts` (exported as `proxy`) and is **not** named `middleware.ts`. This is intentional: `@supabase/ssr` causes a Turbopack deadlock when imported from middleware. `proxy.ts` uses plain cookie inspection (`sb-<projectRef>-auth-token`) instead of the SSR client to stay deadlock-free.

### Public API pipeline (`lib/api-auth.ts`)

Every `/api/v1/*` route calls `authenticateRequest(req)` which:
1. Reads `X-API-Key` header
2. Looks up the profile (service-role client)
3. Resets the monthly usage window if elapsed
4. Enforces per-tier limits (`FREE_LIMIT = 100`, `PRO_LIMIT = 10_000`)
5. Increments `calls_used`
6. Returns `{ ok: true, profile, supabase }` or `{ ok: false, response }`

After auth, routes call `checkEcosystemAccess()` to gate pro-only ecosystems, then `logApiRequest()` to write to `api_requests`.

### Database schema (Supabase Postgres)

Key tables in `supabase/migrations/`:
- **`profiles`** — one row per auth user; holds `api_key`, `tier`, `calls_used`, `calls_reset_at`, Stripe IDs. Auto-created by `handle_new_user()` trigger.
- **`ecosystems`** — catalog of supported ecosystems; `available_on_free` gates free-tier access.
- **`content_items`** — content records (`best_practices`, `news`, `integrations`) keyed by `ecosystem_slug`.
- **`api_requests`** — append-only audit log; no RLS, service role only.

RLS is on for `profiles`, `ecosystems`, `content_items`. Sensitive `profiles` columns (`tier`, `calls_used`, `api_key`, Stripe IDs) have `REVOKE UPDATE` from `authenticated` — all writes to these must go through service-role routes or webhooks.

Full-text search is implemented as a Postgres RPC: `search_content_items(search_query, filter_ecosystem, filter_category, user_tier)`.

### Stripe integration

- `POST /api/stripe/checkout` — creates a Checkout session; sets `client_reference_id` to the user's profile ID so the webhook can match it.
- `POST /api/stripe/webhook` — handles `checkout.session.completed` (upgrades to `pro`) and `customer.subscription.deleted` (downgrades to `free`). Requires raw body bytes for signature verification — do not call `.json()` before `stripe.webhooks.constructEvent`.
- `POST /api/stripe/portal` — creates a Billing Portal session for existing customers.

### Environment variables required

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRO_PRICE_ID
NEXT_PUBLIC_APP_URL
```

## Brand & design system

- Primary accent: `#1D9E75` (green)
- Dark accent: `#0F6E56`
- Headlines: `font-serif`, `font-weight: 400` (not bold)
- Italic accent word in headlines: italic + `text-[#1D9E75]`
- Code/mono elements: `font-mono`
- Section labels: `font-mono text-[9px] uppercase tracking-widest` muted
- Tool/method rows: `border-l-2 border-[#1D9E75] pl-4` — never cards
- Pricing: feature comparison rows — never bullet lists
- No component libraries (no shadcn, MUI, etc.)
- `proxy.ts` not `middleware.ts` (Next.js 16 convention)
- Must support light and dark mode throughout
