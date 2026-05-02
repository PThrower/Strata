// Static behavioral analysis for an MCP server's GitHub repo.
// Fetches README + manifests + heuristically-picked source files, extracts
// declared tools and capability flags, and surfaces a hosted-endpoint hint.
// No live probing — that's Phase 3.

import { RateLimiter } from './github-security'

export type CapabilityFlag =
  | 'shell_exec'
  | 'fs_write'
  | 'net_egress'
  | 'secret_read'
  | 'dynamic_eval'
  | 'arbitrary_sql'
  | 'process_spawn'

export interface ExtractedTool {
  name: string
  description: string
}

export type StaticStatus =
  | 'scored'
  | 'no_source'
  | 'error_transient'
  | 'error_permanent'

export interface StaticAnalysis {
  status: StaticStatus
  toolNames: string[]
  toolDescriptions: ExtractedTool[]
  capabilityFlags: CapabilityFlag[]
  hostedEndpointHint: string | null
  endpointSource: 'readme' | 'manifest' | null
  npmPackage: string | null
  pypiPackage: string | null
  sourceBytesScanned: number
  filesScanned: string[]
  defaultBranch: string | null
}

const GH_API = 'https://api.github.com'
const RAW_BASE = 'https://raw.githubusercontent.com'
const MAX_TOTAL_BYTES = 256_000
const MAX_SOURCE_FILES = 8
const MANIFEST_FILES = ['package.json', 'pyproject.toml', 'setup.py', 'Cargo.toml', 'go.mod']
const FETCH_TIMEOUT_MS = 10_000

function ghApiHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  return h
}

function rawHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: 'text/plain' }
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  return h
}

interface GhRepoMeta {
  default_branch: string
  homepage: string | null
}

interface GhTreeResp {
  tree: { path: string; type: string; size?: number }[]
  truncated: boolean
}

async function fetchJson<T>(url: string, headers: Record<string, string>): Promise<T | null> {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

async function fetchText(url: string, headers: Record<string, string>, byteCap: number): Promise<string | null> {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    if (buf.byteLength > byteCap) return new TextDecoder().decode(buf.slice(0, byteCap))
    return new TextDecoder().decode(buf)
  } catch {
    return null
  }
}

// ── Regex patterns ──────────────────────────────────────────────────────────

// Capability flags. Each pattern matches anywhere in source; one hit = flag set.
// Soft signals — false positives become small penalties, never quarantine.
const FLAG_PATTERNS: { flag: CapabilityFlag; rx: RegExp }[] = [
  { flag: 'shell_exec',    rx: /\b(?:child_process|exec(?:Sync)?|spawn(?:Sync)?|execa|subprocess\.(?:run|Popen|call)|os\.system|shell\s*=\s*True)\b/ },
  { flag: 'fs_write',      rx: /\b(?:fs\.(?:writeFile|appendFile|writeFileSync|appendFileSync)|writeFile\s*\(|open\s*\([^)]*['"][wa]['"]|Path\.write_text|fs::write)\b/ },
  { flag: 'net_egress',    rx: /\b(?:fetch\s*\(|axios\.|http\.request|requests\.(?:get|post|put|delete|patch)|urllib\.request|reqwest::)/ },
  { flag: 'secret_read',   rx: /\b(?:process\.env|os\.environ|os\.getenv|std::env::var|dotenv|require\(['"]keytar)/ },
  { flag: 'dynamic_eval',  rx: /\b(?:eval\s*\(|new\s+Function\s*\(|exec\s*\([^)]*['"][^'"]+['"]|compile\s*\([^)]*['"]exec['"])/ },
  { flag: 'arbitrary_sql', rx: /(?:\$\{[^}]*\}|f['"][^'"]*\{[^}]*\}[^'"]*)\s*(?:SELECT|INSERT|UPDATE|DELETE|DROP)\b/i },
  { flag: 'process_spawn', rx: /\b(?:fork\s*\(|multiprocessing\.Process|threading\.Thread)\b/ },
]

// Tool registration patterns. Each matcher returns [name, description] pairs.
// Comments don't trigger because every pattern requires the registration syntax.
const TOOL_PATTERNS: RegExp[] = [
  // JS/TS: server.registerTool('name', { description: '...' }) / server.tool / server.setTool
  /(?:server|app|mcp)\.(?:registerTool|setTool|tool)\s*\(\s*['"]([^'"\\]{1,80})['"]\s*,\s*\{[\s\S]{0,800}?description\s*:\s*['"]([\s\S]{1,500}?[^\\])['"]/g,
  // Python decorator: @mcp.tool()  / @app.tool() / @server.tool()  with triple-quoted docstring
  /@(?:mcp|app|server)\.tool\s*\([^)]*\)\s*(?:async\s+)?def\s+(\w{1,80})\s*\([^)]*\)[^:]*:\s*(?:r|b|rb|br)?["']{3}([\s\S]{1,500}?)["']{3}/g,
  // Python: Tool(name='...', description='...')
  /Tool\s*\(\s*name\s*=\s*['"]([^'"\\]{1,80})['"]\s*,\s*description\s*=\s*['"]([\s\S]{1,500}?[^\\])['"]/g,
]

// Hosted-endpoint patterns. Anchor to URL boundaries so we capture clean URLs.
const README_ENDPOINT_PATTERNS: RegExp[] = [
  /https?:\/\/[a-z0-9.-]+\.(?:modelcontextprotocol\.io|glama\.ai|smithery\.ai|mcp\.run)\/[^\s)>"'\]]*/gi,
  /(?:^|\s)mcp(?:_endpoint|_url)?\s*[:=]\s*['"]?(https?:\/\/[^\s)>"'\]]+)['"]?/gim,
]

const NPM_PKG_RX = /"name"\s*:\s*"([^"\\]+)"/

// ── Tool extraction ─────────────────────────────────────────────────────────

export function extractTools(source: string): ExtractedTool[] {
  const tools: ExtractedTool[] = []
  const seen = new Set<string>()
  for (const rx of TOOL_PATTERNS) {
    rx.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = rx.exec(source))) {
      const name = m[1]?.trim()
      const desc = m[2]?.trim().replace(/\s+/g, ' ').slice(0, 500)
      if (!name || !desc || seen.has(name)) continue
      seen.add(name)
      tools.push({ name, description: desc })
      if (tools.length >= 100) return tools
    }
  }
  return tools
}

export function extractCapabilityFlags(source: string): CapabilityFlag[] {
  const out: CapabilityFlag[] = []
  for (const { flag, rx } of FLAG_PATTERNS) {
    if (rx.test(source) && !out.includes(flag)) out.push(flag)
  }
  return out
}

export function extractEndpointHints(readme: string): string | null {
  for (const rx of README_ENDPOINT_PATTERNS) {
    rx.lastIndex = 0
    const m = rx.exec(readme)
    if (m) {
      const url = (m[1] ?? m[0]).trim().replace(/[).,;>"'\]]+$/, '')
      if (/^https?:\/\//i.test(url)) return url
    }
  }
  return null
}

// ── Source-file picker ──────────────────────────────────────────────────────

function scoreSourceCandidate(path: string): number {
  if (/(?:^|\/)(?:test|tests|__tests__|spec|specs|fixtures|examples?)(?:\/|$)/i.test(path)) return -100
  if (/\.d\.ts$/.test(path)) return -50
  if (!/\.(?:ts|tsx|js|mjs|cjs|py)$/.test(path)) return -100

  let score = 0
  if (/(?:^|\/)(?:tool|mcp)/i.test(path))        score += 10
  if (/(?:^|\/)(?:server|index|main|app)/i.test(path)) score += 5
  const depth = path.split('/').length - 1
  if (depth === 0)            score += 3
  else if (depth === 1)       score += 2
  if (/^src\/|^lib\//.test(path)) score += 1
  return score
}

function pickSourceFiles(tree: GhTreeResp): string[] {
  if (tree.truncated) return []
  const blobs = tree.tree.filter(t => t.type === 'blob' && (t.size ?? 0) < 200_000)
  const ranked = blobs
    .map(b => ({ path: b.path, score: scoreSourceCandidate(b.path) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
  return ranked.slice(0, MAX_SOURCE_FILES).map(r => r.path)
}

// ── Manifest parsing ────────────────────────────────────────────────────────

function parsePackageJson(text: string): { npm: string | null; endpoint: string | null } {
  try {
    const json = JSON.parse(text) as { name?: string; mcp?: { endpoint?: string }; homepage?: string }
    const npm = typeof json.name === 'string' ? json.name : null
    let endpoint: string | null = null
    if (json.mcp && typeof json.mcp.endpoint === 'string') endpoint = json.mcp.endpoint
    return { npm, endpoint }
  } catch {
    const nameMatch = text.match(NPM_PKG_RX)
    return { npm: nameMatch?.[1] ?? null, endpoint: null }
  }
}

function parsePyproject(text: string): { pypi: string | null } {
  const m = text.match(/^\s*name\s*=\s*['"]([^'"]+)['"]/m) ?? text.match(/\[project\][\s\S]*?name\s*=\s*['"]([^'"]+)['"]/)
  return { pypi: m?.[1] ?? null }
}

// ── Main entry point ────────────────────────────────────────────────────────

export async function analyzeRepoStatic(
  owner: string,
  repo: string,
  limiter: RateLimiter,
): Promise<StaticAnalysis> {
  const empty: StaticAnalysis = {
    status: 'no_source',
    toolNames: [], toolDescriptions: [], capabilityFlags: [],
    hostedEndpointHint: null, endpointSource: null,
    npmPackage: null, pypiPackage: null,
    sourceBytesScanned: 0, filesScanned: [], defaultBranch: null,
  }

  // Step 1: repo metadata for default branch + homepage
  await limiter.wait(null, null)
  const repoMeta = await fetchJson<GhRepoMeta>(`${GH_API}/repos/${owner}/${repo}`, ghApiHeaders())
  if (!repoMeta) return { ...empty, status: 'error_transient' }
  const branch = repoMeta.default_branch || 'main'

  // Step 2: tree (one call, gives us the file list)
  await limiter.wait(null, null)
  const tree = await fetchJson<GhTreeResp>(
    `${GH_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=true`,
    ghApiHeaders(),
  )

  let totalBytes = 0
  let combinedSource = ''
  let combinedReadme = ''
  const filesScanned: string[] = []
  let npmPackage: string | null = null
  let pypiPackage: string | null = null
  let manifestEndpoint: string | null = null

  // Step 3: README
  for (const readmeName of ['README.md', 'README.MD', 'Readme.md', 'readme.md', 'README']) {
    await limiter.wait(null, null)
    const text = await fetchText(`${RAW_BASE}/${owner}/${repo}/${branch}/${readmeName}`, rawHeaders(), MAX_TOTAL_BYTES)
    if (text) {
      combinedReadme = text
      filesScanned.push(readmeName)
      totalBytes += text.length
      break
    }
  }

  // Step 4: manifests
  for (const manifest of MANIFEST_FILES) {
    if (totalBytes >= MAX_TOTAL_BYTES) break
    await limiter.wait(null, null)
    const text = await fetchText(`${RAW_BASE}/${owner}/${repo}/${branch}/${manifest}`, rawHeaders(), MAX_TOTAL_BYTES - totalBytes)
    if (!text) continue
    filesScanned.push(manifest)
    totalBytes += text.length
    combinedSource += `\n// ── ${manifest} ──\n${text}`
    if (manifest === 'package.json') {
      const parsed = parsePackageJson(text)
      npmPackage = parsed.npm
      manifestEndpoint = parsed.endpoint
    } else if (manifest === 'pyproject.toml' || manifest === 'setup.py') {
      const parsed = parsePyproject(text)
      pypiPackage ??= parsed.pypi
    }
  }

  // Step 5: source files
  if (tree && !tree.truncated) {
    const candidates = pickSourceFiles(tree)
    for (const path of candidates) {
      if (totalBytes >= MAX_TOTAL_BYTES) break
      await limiter.wait(null, null)
      const text = await fetchText(`${RAW_BASE}/${owner}/${repo}/${branch}/${path}`, rawHeaders(), MAX_TOTAL_BYTES - totalBytes)
      if (!text) continue
      filesScanned.push(path)
      totalBytes += text.length
      combinedSource += `\n// ── ${path} ──\n${text}`
    }
  }

  if (totalBytes === 0) return { ...empty, defaultBranch: branch, status: 'no_source' }

  // Step 6: extract
  const tools = extractTools(combinedSource)
  const flags = extractCapabilityFlags(combinedSource)
  let hostedHint: string | null = manifestEndpoint
  let endpointSource: 'readme' | 'manifest' | null = manifestEndpoint ? 'manifest' : null
  if (!hostedHint && combinedReadme) {
    hostedHint = extractEndpointHints(combinedReadme)
    if (hostedHint) endpointSource = 'readme'
  }

  return {
    status: 'scored',
    toolNames: tools.map(t => t.name),
    toolDescriptions: tools,
    capabilityFlags: flags,
    hostedEndpointHint: hostedHint,
    endpointSource,
    npmPackage,
    pypiPackage,
    sourceBytesScanned: totalBytes,
    filesScanned,
    defaultBranch: branch,
  }
}
