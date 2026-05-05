// Live HTTP prober for hosted MCP endpoints. Mirrors lib/x402-verifier.ts in role.
// Never throws — all errors are converted to status-bearing results.
// Does NOT write to the database; caller (scripts/probe-mcp-endpoints.ts) handles
// persistence. Only reads mcp_probe_optouts to honour operator opt-outs.

import { createClient } from '@supabase/supabase-js'

// ── Types ─────────────────────────────────────────────────────────────────────

// Intentionally mirrors scripts/refresh/runtime-static.ts so probe-derived flags
// are directly comparable to static-analysis-derived flags.
export type CapabilityFlag =
  | 'shell_exec'
  | 'fs_write'
  | 'net_egress'
  | 'secret_read'
  | 'dynamic_eval'
  | 'arbitrary_sql'
  | 'process_spawn'

export type McpProbeStatus =
  | 'ok'
  | 'timeout'
  | 'opted_out'
  | 'error_transport'       // DNS, TCP, TLS, non-2xx HTTP, network reset
  | 'error_protocol'        // valid HTTP but JSON-RPC 2.0 envelope malformed
  | 'error_auth_required'   // 401/403 or initialize error code indicating auth
  | 'error_invalid_url'     // not https, malformed, or hostname-less

export interface McpProbeResult {
  endpoint:         string
  status:           McpProbeStatus
  latencyMs:        number | null                                     // total wall time, initialize + tools/list
  toolCount:        number | null                                     // observed via tools/list
  toolNames:        string[]
  toolDescriptions: { name: string; description: string }[]          // for downstream injection scan
  capabilityFlags:  CapabilityFlag[]                                 // re-derived from observed tools
  schemaErrors:     number | null                                     // tools failing MCP Tool schema validation
  driftFromStatic:  boolean | null                                   // null when no baseline supplied
  driftDetails:     {
    addedTools:        string[]
    removedTools:      string[]
    addedCapabilities: CapabilityFlag[]
  } | null
  serverInfo:       { name?: string; version?: string; protocolVersion?: string } | null
  error:            string | null                                     // sanitized; set on error_* only
  rawListing:       unknown                                           // capped to MAX_LISTING_BYTES
  probedAt:         string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PROBE_TIMEOUT_MS  = 5_000
const MAX_BODY_BYTES    = 1_024 * 1_024   // 1 MB read cap
const MAX_LISTING_BYTES = 64 * 1_024      // 64 KB for rawListing — matches mcp_runtime_probes cap

// ── Capability patterns (mirrored from scripts/refresh/runtime-static.ts) ────

const FLAG_PATTERNS: { flag: CapabilityFlag; rx: RegExp }[] = [
  { flag: 'shell_exec',    rx: /\b(?:child_process|exec(?:Sync)?|spawn(?:Sync)?|execa|subprocess\.(?:run|Popen|call)|os\.system|shell\s*=\s*True)\b/ },
  { flag: 'fs_write',      rx: /\b(?:fs\.(?:writeFile|appendFile|writeFileSync|appendFileSync)|writeFile\s*\(|open\s*\([^)]*['"][wa]['"]|Path\.write_text|fs::write)\b/ },
  { flag: 'net_egress',    rx: /\b(?:fetch\s*\(|axios\.|http\.request|requests\.(?:get|post|put|delete|patch)|urllib\.request|reqwest::)/ },
  { flag: 'secret_read',   rx: /\b(?:process\.env|os\.environ|os\.getenv|std::env::var|dotenv|require\(['"]keytar)/ },
  { flag: 'dynamic_eval',  rx: /\b(?:eval\s*\(|new\s+Function\s*\(|exec\s*\([^)]*['"][^'"]+['"]|compile\s*\([^)]*['"]exec['"])/ },
  { flag: 'arbitrary_sql', rx: /(?:\$\{[^}]*\}|f['"][^'"]*\{[^}]*\}[^'"]*)\s*(?:SELECT|INSERT|UPDATE|DELETE|DROP)\b/i },
  { flag: 'process_spawn', rx: /\b(?:fork\s*\(|multiprocessing\.Process|threading\.Thread)\b/ },
]

function extractFlagsFromText(text: string): CapabilityFlag[] {
  const out: CapabilityFlag[] = []
  for (const { flag, rx } of FLAG_PATTERNS) {
    if (rx.test(text) && !out.includes(flag)) out.push(flag)
  }
  return out
}

// ── JSON-RPC 2.0 type guards ──────────────────────────────────────────────────

interface JsonRpcOk   { jsonrpc: string; id: unknown; result: unknown }
interface JsonRpcErr  { jsonrpc: string; id: unknown; error: { code: number; message: string } }
type JsonRpcResp = JsonRpcOk | JsonRpcErr

function isJsonRpcResponse(v: unknown): v is JsonRpcResp {
  return (
    typeof v === 'object' && v !== null &&
    (v as Record<string, unknown>).jsonrpc === '2.0' &&
    ('result' in (v as object) || 'error' in (v as object))
  )
}

function isJsonRpcErr(v: JsonRpcResp): v is JsonRpcErr {
  return 'error' in v
}

function isAuthError(err: { code: number; message: string }): boolean {
  return (
    err.code === -32001 ||   // Unauthorized — common in MCP implementations
    err.code === 401 ||
    /auth|unauthorized|credential|forbidden/i.test(err.message)
  )
}

// ── Response body reader (handles both JSON and text/event-stream) ────────────

async function readBody(res: Response, maxBytes: number): Promise<string> {
  const buf  = await res.arrayBuffer()
  const text = new TextDecoder().decode(buf.byteLength > maxBytes ? buf.slice(0, maxBytes) : buf)
  const ct   = res.headers.get('content-type') ?? ''
  if (ct.includes('text/event-stream')) {
    // Extract first data: line from SSE stream.
    const m = text.match(/^data:\s*(.+)$/m)
    return m ? m[1].trim() : text
  }
  return text
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sanitizeError(err: unknown): string {
  if (!err || typeof err !== 'object') return String(err).slice(0, 120)
  const e = err as { message?: unknown; code?: unknown }
  const parts: string[] = []
  if (typeof e.code    === 'string') parts.push(e.code)
  if (typeof e.message === 'string') parts.push(e.message.slice(0, 100))
  return parts.join(': ') || 'unknown error'
}

function makeFallback(endpoint: string, status: McpProbeStatus, error?: string): McpProbeResult {
  return {
    endpoint, status,
    latencyMs: null, toolCount: null, toolNames: [], toolDescriptions: [],
    capabilityFlags: [], schemaErrors: null,
    driftFromStatic: null, driftDetails: null, serverInfo: null,
    error: error ?? null, rawListing: null,
    probedAt: new Date().toISOString(),
  }
}

function extractServerInfo(resp: JsonRpcResp): McpProbeResult['serverInfo'] {
  if (isJsonRpcErr(resp)) return null
  const r = (resp as JsonRpcOk).result
  if (!r || typeof r !== 'object') return null
  const result = r as Record<string, unknown>

  const info: { name?: string; version?: string; protocolVersion?: string } = {}
  if (typeof result.protocolVersion === 'string') info.protocolVersion = result.protocolVersion

  const si = result.serverInfo
  if (si && typeof si === 'object') {
    const s = si as Record<string, unknown>
    if (typeof s.name    === 'string') info.name    = s.name
    if (typeof s.version === 'string') info.version = s.version
  }
  return Object.keys(info).length > 0 ? info : null
}

interface ParsedListing {
  toolNames:        string[]
  toolDescriptions: { name: string; description: string }[]
  capabilityFlags:  CapabilityFlag[]
  schemaErrors:     number
  rawListing:       unknown
}

function parseToolListing(listJson: JsonRpcResp, rawText: string): ParsedListing {
  const empty: ParsedListing = {
    toolNames: [], toolDescriptions: [], capabilityFlags: [], schemaErrors: 0, rawListing: null,
  }
  if (isJsonRpcErr(listJson)) return empty

  const result = (listJson as JsonRpcOk).result
  if (!result || typeof result !== 'object') return empty
  const tools = (result as Record<string, unknown>).tools
  if (!Array.isArray(tools)) return empty

  const toolNames:        string[] = []
  const toolDescriptions: { name: string; description: string }[] = []
  let schemaErrors = 0

  for (const tool of tools) {
    if (!tool || typeof tool !== 'object') { schemaErrors++; continue }
    const t = tool as Record<string, unknown>

    if (typeof t.name !== 'string' || t.name.trim() === '') { schemaErrors++; continue }
    if ('description' in t && typeof t.description !== 'string') schemaErrors++
    if ('inputSchema' in t && (typeof t.inputSchema !== 'object' || t.inputSchema === null || Array.isArray(t.inputSchema))) schemaErrors++

    const name        = t.name.trim()
    const description = typeof t.description === 'string' ? t.description.trim() : ''

    toolNames.push(name)
    if (description) toolDescriptions.push({ name, description })
  }

  // Derive capability flags from observed descriptions + input schemas
  const descText   = toolDescriptions.map(td => td.description).join('\n')
  const schemaText = tools
    .filter(t => t && typeof t === 'object' && (t as Record<string, unknown>).inputSchema)
    .map(t => JSON.stringify((t as Record<string, unknown>).inputSchema))
    .join('\n')
  const capabilityFlags = extractFlagsFromText(`${descText}\n${schemaText}`)

  // Truncate rawListing to MAX_LISTING_BYTES; store null if over limit
  const rawListing = rawText.length <= MAX_LISTING_BYTES ? listJson : null

  return { toolNames, toolDescriptions, capabilityFlags, schemaErrors, rawListing }
}

// ── Supabase client (avoids importing lib/supabase-server.ts which pulls next/headers) ──

function createProbeClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function probeMcpEndpoint(
  endpoint: string,
  opts?: { staticBaseline?: { toolNames: string[]; capabilityFlags: CapabilityFlag[] } },
): Promise<McpProbeResult> {

  // 1. URL validation
  let parsed: URL
  try { parsed = new URL(endpoint) } catch {
    return makeFallback(endpoint, 'error_invalid_url', 'invalid URL')
  }
  if (parsed.protocol !== 'https:') {
    return makeFallback(endpoint, 'error_invalid_url', 'must be https')
  }
  const url    = parsed.toString()
  const domain = parsed.hostname

  // 2. Opt-out check (read-only, non-fatal on DB error)
  try {
    const sb = createProbeClient()
    const { data } = await sb
      .from('mcp_probe_optouts')
      .select('domain')
      .eq('domain', domain)
      .maybeSingle()
    if (data) return makeFallback(url, 'opted_out')
  } catch { /* non-fatal — proceed with probe */ }

  // 3. Probe (shared 5s AbortController across both requests)
  const t0    = Date.now()
  const ctl   = new AbortController()
  const timer = setTimeout(() => ctl.abort(), PROBE_TIMEOUT_MS)

  const headers = () => ({
    'Content-Type': 'application/json',
    'Accept':       'application/json, text/event-stream',
    'User-Agent':   'StrataMcpProbe/1.0 (+https://strata.dev/probe)',
  })

  try {
    // ── Step A: initialize ────────────────────────────────────────────────
    let initRes: Response
    try {
      initRes = await fetch(url, {
        method:   'POST',
        headers:  headers(),
        body:     JSON.stringify({
          jsonrpc: '2.0', id: 1, method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities:    {},
            clientInfo:      { name: 'StrataMcpProbe', version: '1.0' },
          },
        }),
        redirect: 'manual',
        signal:   ctl.signal,
      })
    } catch (err) {
      const lat = Date.now() - t0
      if (ctl.signal.aborted) return { ...makeFallback(url, 'timeout'),          latencyMs: lat }
      return               { ...makeFallback(url, 'error_transport', sanitizeError(err)), latencyMs: lat }
    }

    if (initRes.status === 401 || initRes.status === 403) {
      return { ...makeFallback(url, 'error_auth_required'), latencyMs: Date.now() - t0 }
    }
    if (!initRes.ok) {
      return { ...makeFallback(url, 'error_transport', `HTTP ${initRes.status}`), latencyMs: Date.now() - t0 }
    }

    let initJson: unknown
    try {
      initJson = JSON.parse(await readBody(initRes, MAX_BODY_BYTES))
    } catch {
      return { ...makeFallback(url, 'error_protocol', 'init: unparseable JSON'), latencyMs: Date.now() - t0 }
    }
    if (!isJsonRpcResponse(initJson)) {
      return { ...makeFallback(url, 'error_protocol', 'init: missing jsonrpc 2.0 envelope'), latencyMs: Date.now() - t0 }
    }
    if (isJsonRpcErr(initJson) && isAuthError(initJson.error)) {
      return { ...makeFallback(url, 'error_auth_required'), latencyMs: Date.now() - t0 }
    }

    const serverInfo = extractServerInfo(initJson)

    // ── Step B: tools/list ────────────────────────────────────────────────
    let listRes: Response
    try {
      listRes = await fetch(url, {
        method:   'POST',
        headers:  headers(),
        body:     JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
        redirect: 'manual',
        signal:   ctl.signal,
      })
    } catch (err) {
      const lat = Date.now() - t0
      if (ctl.signal.aborted) return { ...makeFallback(url, 'timeout'),          latencyMs: lat, serverInfo }
      return               { ...makeFallback(url, 'error_transport', sanitizeError(err)), latencyMs: lat, serverInfo }
    }

    const latencyMs = Date.now() - t0

    if (listRes.status === 401 || listRes.status === 403) {
      return { ...makeFallback(url, 'error_auth_required'), latencyMs, serverInfo }
    }
    if (!listRes.ok) {
      return { ...makeFallback(url, 'error_transport', `HTTP ${listRes.status}`), latencyMs, serverInfo }
    }

    let listJson: unknown
    let rawText: string
    try {
      rawText  = await readBody(listRes, MAX_BODY_BYTES)
      listJson = JSON.parse(rawText)
    } catch {
      return { ...makeFallback(url, 'error_protocol', 'tools/list: unparseable JSON'), latencyMs, serverInfo }
    }
    if (!isJsonRpcResponse(listJson)) {
      return { ...makeFallback(url, 'error_protocol', 'tools/list: missing jsonrpc 2.0 envelope'), latencyMs, serverInfo }
    }
    if (isJsonRpcErr(listJson) && isAuthError(listJson.error)) {
      return { ...makeFallback(url, 'error_auth_required'), latencyMs, serverInfo }
    }

    // ── Parse and validate tool listing ───────────────────────────────────
    const { toolNames, toolDescriptions, capabilityFlags, schemaErrors, rawListing } =
      parseToolListing(listJson, rawText!)

    // ── Drift detection ───────────────────────────────────────────────────
    let driftFromStatic: boolean | null = null
    let driftDetails:    McpProbeResult['driftDetails'] = null

    if (opts?.staticBaseline) {
      const base       = opts.staticBaseline
      const staticNames = new Set(base.toolNames)
      const probeNames  = new Set(toolNames)
      const staticCaps  = new Set(base.capabilityFlags)

      const addedTools        = toolNames.filter(n => !staticNames.has(n))
      const removedTools      = base.toolNames.filter(n => !probeNames.has(n))
      const addedCapabilities = capabilityFlags.filter(f => !staticCaps.has(f))

      driftFromStatic = addedTools.length > 0 || removedTools.length > 0 || addedCapabilities.length > 0
      driftDetails    = { addedTools, removedTools, addedCapabilities }
    }

    return {
      endpoint:         url,
      status:           'ok',
      latencyMs,
      toolCount:        toolNames.length,
      toolNames,
      toolDescriptions,
      capabilityFlags,
      schemaErrors,
      driftFromStatic,
      driftDetails,
      serverInfo,
      error:            null,
      rawListing,
      probedAt:         new Date().toISOString(),
    }

  } finally {
    clearTimeout(timer)
  }
}
