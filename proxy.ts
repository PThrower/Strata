// Edge security gateway for Strata. Runs before every matched request.
//
// Provides:
//   - Defense-in-depth security headers on all responses
//   - Path-level scanner blocking (.env, wp-admin, etc.) returns 404
//   - Path-traversal rejection (..)
//   - For /api/* and /mcp:
//       * User-Agent enforcement (no empty UAs)
//       * Mass-scanner UA blocklist (nuclei, sqlmap, nikto, masscan, …)
//       * In-memory sliding-window rate limit per IP
//       * Content-Length pre-check (413 before route runs)
//   - Dashboard session redirect (existing behavior, preserved)
//
// CRITICAL — Next.js 16 convention:
//   This file MUST be named `proxy.ts` (NOT `middleware.ts`). Next.js 16
//   deprecated the `middleware` convention in favor of `proxy`; only one
//   such file is supported per project. Adding a sibling `middleware.ts`
//   has no effect — it will be silently ignored by the framework.
//
// Rate-limiter scope:
//   The token table lives in module-scope memory. Vercel's Fluid Compute
//   may run multiple Lambda instances concurrently, so a determined
//   attacker hitting different instances could drift above the per-IP cap
//   proportionally to the instance count. Vercel's edge DDoS protection
//   handles the volumetric layer; this proxy enforces the application-tier
//   abuse limits within each instance. Migrate to Upstash Redis if strict
//   global enforcement is ever required.

import { NextResponse, type NextRequest } from 'next/server'

// ── Security constants ──────────────────────────────────────────────────────
const RATE_WINDOW_MS = 60_000
const API_LIMIT_PER_MIN = 100        // /api/*
const MCP_LIMIT_PER_MIN = 30         // /mcp (more aggressive — embedding/DB heavy)
const MAX_IP_BUCKETS = 50_000        // cleanup threshold
const API_MAX_BODY_BYTES = 100_000   // 100 KB
const MCP_MAX_BODY_BYTES = 50_000    // 50 KB
const MAX_UA_LENGTH = 500            // header-flood guard

// Scanner paths returned as bare 404 — looks like an ordinary miss to the
// attacker. (Vercel.json provides additional CDN-level header hardening
// but cannot return 404 for arbitrary paths without a paid Firewall plan.)
const SCANNER_PATHS = [
  '/.env', '/.env.local', '/.env.production', '/.env.development',
  '/wp-admin', '/wp-login.php', '/xmlrpc.php', '/wp-config.php',
  '/phpinfo.php', '/phpmyadmin', '/pma',
  '/.git/config', '/.git/HEAD', '/.gitignore',
  '/admin.php', '/admin.html', '/.htaccess', '/.htpasswd',
  '/.aws', '/.aws/credentials', '/.ssh',
  '/server-status', '/.DS_Store',
  '/config.php', '/config.json',
  '/web.config', '/.well-known/security.txt.bak',
]

// Mass-scanner User-Agent patterns. These tools indicate hostile intent
// unambiguously — we deliberately do NOT block legitimate clients like
// curl, python-requests, or Go-http-client (widely used by real apps).
const BAD_UA_PATTERNS: RegExp[] = [
  /nuclei/i,        // ProjectDiscovery vulnerability scanner
  /sqlmap/i,        // SQL injection scanner
  /nikto/i,         // Web server scanner
  /masscan/i,       // Port scanner
  /zgrab/i,         // ZMap banner grabber
  /\bnmap\b/i,      // Word boundary — avoid matching "nmapper" or similar
  /acunetix/i,
  /nessus/i,
  /gobuster/i,
  /\bdirb\b/i,
  /dirbuster/i,
  /wpscan/i,
  /wfuzz/i,
  /sqlninja/i,
  /commix/i,
  /libwww-perl/i,   // Perl exploit kits
  /burpcollab/i,    // Burp Collaborator out-of-band probes
  /metasploit/i,
  /qualys/i,
  /openvas/i,
  /headlessbrowser/i,
]

// Sliding-window log per IP bucket. Map<key, ms-timestamps>.
type Timestamps = number[]
const ipBuckets = new Map<string, Timestamps>()

function rateLimit(
  key: string,
  limit: number,
  now: number,
): { ok: boolean; remaining: number; resetAt: number } {
  const cutoff = now - RATE_WINDOW_MS

  // Lazy GC when the table fills up
  if (ipBuckets.size > MAX_IP_BUCKETS) {
    for (const [k, ts] of ipBuckets) {
      const last = ts[ts.length - 1]
      if (last === undefined || last <= cutoff) ipBuckets.delete(k)
    }
  }

  const existing = ipBuckets.get(key)
  let stamps: Timestamps
  if (existing && existing.length > 0) {
    // Drop stale timestamps
    stamps = []
    for (const t of existing) if (t > cutoff) stamps.push(t)
  } else {
    stamps = []
  }

  if (stamps.length >= limit) {
    const first = stamps[0] ?? now
    return { ok: false, remaining: 0, resetAt: first + RATE_WINDOW_MS }
  }

  stamps.push(now)
  ipBuckets.set(key, stamps)
  return { ok: true, remaining: limit - stamps.length, resetAt: now + RATE_WINDOW_MS }
}

function getClientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  return request.headers.get('x-real-ip')?.trim() || '0.0.0.0'
}

function applySecurityHeaders(headers: Headers): void {
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('X-XSS-Protection', '1; mode=block')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
}

function jsonResponse(
  status: number,
  body: unknown,
  extraHeaders?: Record<string, string>,
): NextResponse {
  const resp = NextResponse.json(body, { status })
  applySecurityHeaders(resp.headers)
  if (extraHeaders) {
    for (const [k, v] of Object.entries(extraHeaders)) resp.headers.set(k, v)
  }
  return resp
}

function isPathBlocked(pathname: string): boolean {
  for (const blocked of SCANNER_PATHS) {
    if (pathname === blocked || pathname.startsWith(blocked + '/')) return true
  }
  return false
}

function hasSession(request: NextRequest): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return false
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  const key = `sb-${projectRef}-auth-token`
  return request.cookies.has(key) || request.cookies.has(`${key}.0`)
}

// Sanitize a string for safe inclusion in single-line log output.
function safeLog(s: string, max = 100): string {
  return s.replace(/[\r\n"]/g, ' ').slice(0, max)
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = getClientIp(request)
  const ua = request.headers.get('user-agent') ?? ''
  const now = Date.now()

  // ── 1. Block scanner paths ────────────────────────────────────────────────
  if (isPathBlocked(pathname)) {
    console.error(
      `[security] scanner_path ip=${ip} path=${safeLog(pathname, 80)} ua="${safeLog(ua, 80)}"`,
    )
    const resp = new NextResponse(null, { status: 404 })
    applySecurityHeaders(resp.headers)
    return resp
  }

  // ── 2. Path-traversal attempts ────────────────────────────────────────────
  // NextRequest URL-decodes the pathname, so '..' is canonical. We also
  // match common encoded variants for upstream proxies that don't decode.
  const lowered = pathname.toLowerCase()
  if (
    pathname.includes('..') ||
    lowered.includes('%2e%2e') ||
    lowered.includes('%252e')
  ) {
    console.error(`[security] path_traversal ip=${ip} path=${safeLog(pathname, 80)}`)
    const resp = new NextResponse(null, { status: 400 })
    applySecurityHeaders(resp.headers)
    return resp
  }

  // ── 3. /api/* and /mcp hardening ──────────────────────────────────────────
  const isApi = pathname.startsWith('/api/')
  const isMcp = pathname === '/mcp' || pathname.startsWith('/mcp/')

  if (isApi || isMcp) {
    // Empty / missing UA — block. All real clients send a UA.
    if (!ua) {
      console.error(`[security] empty_ua ip=${ip} path=${safeLog(pathname)}`)
      return jsonResponse(400, { error: 'User-Agent header required' })
    }
    // Pathologically long UA (header-flooding attempt)
    if (ua.length > MAX_UA_LENGTH) {
      console.error(`[security] long_ua ip=${ip} ua_len=${ua.length}`)
      return jsonResponse(400, { error: 'User-Agent too long' })
    }
    // Mass-scanner UA
    for (const re of BAD_UA_PATTERNS) {
      if (re.test(ua)) {
        console.error(
          `[security] bad_ua ip=${ip} pattern=${re.source} ua="${safeLog(ua, 100)}"`,
        )
        return jsonResponse(403, { error: 'Forbidden' })
      }
    }

    // Per-IP, per-route-family rate limit. Buckets are split so an /mcp
    // burst doesn't starve /api (or vice versa).
    const limit = isMcp ? MCP_LIMIT_PER_MIN : API_LIMIT_PER_MIN
    const family = isMcp ? 'mcp' : 'api'
    const rl = rateLimit(`${ip}|${family}`, limit, now)
    if (!rl.ok) {
      console.error(
        `[security] rate_limit ip=${ip} family=${family} limit=${limit} path=${safeLog(pathname)}`,
      )
      return jsonResponse(
        429,
        {
          error: 'Too Many Requests',
          message: `Per-IP limit ${limit}/min exceeded. Add an API key for higher tier limits.`,
          reset_at: new Date(rl.resetAt).toISOString(),
        },
        {
          'Retry-After': String(Math.max(1, Math.ceil((rl.resetAt - now) / 1000))),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(rl.resetAt).toISOString(),
        },
      )
    }

    // Body size pre-check via Content-Length. The route handler does not
    // need to repeat this for clients that send Content-Length (the common
    // case); chunked encoding without CL bypasses this and is handled at
    // the route level via lib/security.readBoundedJson when applicable.
    const cl = parseInt(request.headers.get('content-length') ?? '0', 10)
    const maxBody = isMcp ? MCP_MAX_BODY_BYTES : API_MAX_BODY_BYTES
    if (cl > maxBody) {
      console.error(
        `[security] body_too_large ip=${ip} path=${safeLog(pathname)} length=${cl} max=${maxBody}`,
      )
      return jsonResponse(413, { error: 'Payload Too Large', max_bytes: maxBody })
    }
  }

  // ── 4. Dashboard session guard ────────────────────────────────────────────
  if (pathname.startsWith('/dashboard') && !hasSession(request)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const resp = NextResponse.redirect(url)
    applySecurityHeaders(resp.headers)
    return resp
  }

  // ── 5. Default — apply security headers and continue ──────────────────────
  const resp = NextResponse.next()
  applySecurityHeaders(resp.headers)
  return resp
}

export const config = {
  // Match everything except static assets, Next.js internals, and common
  // file extensions served from the public/ directory.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|css|js|map)$).*)',
  ],
}
