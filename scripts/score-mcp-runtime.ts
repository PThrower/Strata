// Backfill / refresh runtime behavioral scores for all mcp_servers rows.
// Safe to interrupt and re-run — each row is checkpointed via runtime_updated_at.
//
// Usage:
//   export $(grep -v '^#' .env.local | xargs)
//   npx tsx scripts/score-mcp-runtime.ts
//
// Optional env:
//   RUNTIME_LIMIT=100        — process at most N rows this run (default: all)
//   RUNTIME_STALE_DAYS=14    — re-score rows older than N days (default: 14)

import Anthropic from '@anthropic-ai/sdk'
import { getServiceClient } from './refresh/writer'
import { parseGitHubUrl, RateLimiter } from './refresh/github-security'
import { analyzeRepoStatic } from './refresh/runtime-static'
import { scanToolDescriptions } from './refresh/runtime-tool-injection'
import { computeRuntimeScore, type RuntimeSignals } from './refresh/runtime-score'

const BOLD   = '\x1b[1m'
const DIM    = '\x1b[2m'
const GREEN  = '\x1b[38;2;0;196;114m'
const YELLOW = '\x1b[38;2;245;158;11m'
const RED    = '\x1b[38;2;239;68;68m'
const RESET  = '\x1b[0m'

const STALE_DAYS = parseInt(process.env.RUNTIME_STALE_DAYS ?? '14', 10)
const LIMIT = process.env.RUNTIME_LIMIT ? parseInt(process.env.RUNTIME_LIMIT, 10) : null

interface McpRow {
  id: string
  url: string | null
  name: string
  injection_risk_score: number | null
}

interface ProbeRow {
  server_id:         string
  status:            string
  latency_ms:        number | null
  drift_from_static: boolean | null
  schema_errors:     number | null
  probed_at:         string
}

async function main() {
  const supabase = getServiceClient()
  const limiter = new RateLimiter()
  const anthropic = process.env.ANTHROPIC_API_KEY
    ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    : null

  if (!process.env.GITHUB_TOKEN) {
    console.warn(`${YELLOW}⚠ GITHUB_TOKEN not set — using unauthenticated (60 req/hr limit)${RESET}`)
  }
  if (!anthropic) {
    console.warn(`${YELLOW}⚠ ANTHROPIC_API_KEY not set — tool-injection scan limited to Layer 1 only${RESET}`)
  }

  let query = supabase
    .from('mcp_servers')
    .select('id, url, name, injection_risk_score')
    .or(
      `runtime_updated_at.is.null,` +
      `runtime_updated_at.lt.${new Date(Date.now() - STALE_DAYS * 86_400_000).toISOString()},` +
      `runtime_status.eq.error_rate_limited`,
    )
    .order('id')
    .limit(100_000)

  if (LIMIT) query = query.limit(LIMIT)

  const { data: rows, error } = await query
  if (error) throw new Error(`Failed to fetch candidates: ${error.message}`)

  const total = (rows ?? []).length
  console.log(`\n${BOLD}Runtime-scoring ${total} MCP servers${RESET}  ${DIM}(stale_days=${STALE_DAYS}${LIMIT ? `, limit=${LIMIT}` : ''})${RESET}\n`)

  // Batch-load latest probes (within STALE_DAYS) for all candidate servers.
  // Capped at 5,000 IDs to keep the query size reasonable; beyond that we fall back to null probe signals.
  const probeMap = new Map<string, ProbeRow>()
  const candidateIds = (rows ?? []).map(r => (r as McpRow).id)
  if (candidateIds.length > 0 && candidateIds.length <= 5_000) {
    const probeCutoff = new Date(Date.now() - STALE_DAYS * 86_400_000).toISOString()
    const { data: probes } = await supabase
      .from('mcp_runtime_probes')
      .select('server_id, status, latency_ms, drift_from_static, schema_errors, probed_at')
      .in('server_id', candidateIds)
      .gte('probed_at', probeCutoff)
      .order('probed_at', { ascending: false })
    for (const p of (probes ?? []) as ProbeRow[]) {
      if (!probeMap.has(p.server_id)) probeMap.set(p.server_id, p)
    }
    if (probeMap.size > 0) {
      console.log(`${DIM}Loaded ${probeMap.size} recent probe(s) for score integration.${RESET}\n`)
    }
  }

  const counts = { scored: 0, no_source: 0, not_github: 0, error: 0, quarantined: 0 }

  for (let i = 0; i < (rows ?? []).length; i++) {
    const row = (rows as McpRow[])[i]
    const prefix = `[${String(i + 1).padStart(String(total).length)}/${total}]`

    if (!row.url) {
      await checkpoint(supabase, row.id, 'no_source')
      counts.no_source++
      console.log(`${DIM}${prefix} no url — skipped${RESET}`)
      continue
    }
    const parsed = parseGitHubUrl(row.url)
    if (!parsed) {
      await checkpoint(supabase, row.id, 'no_source')
      counts.not_github++
      console.log(`${DIM}${prefix} not_github  ${row.url}${RESET}`)
      continue
    }

    try {
      const analysis = await analyzeRepoStatic(parsed.owner, parsed.repo, limiter)

      if (analysis.status === 'error_transient' || analysis.status === 'error_permanent') {
        await checkpoint(supabase, row.id, analysis.status)
        counts.error++
        console.log(`${RED}${prefix} ${analysis.status}  ${parsed.owner}/${parsed.repo}${RESET}`)
        continue
      }

      // Tool-description injection scan (only if we extracted any)
      const injection = await scanToolDescriptions(analysis.toolDescriptions, anthropic)

      const probe = probeMap.get(row.id) ?? null
      const signals: RuntimeSignals = {
        toolCount: analysis.toolDescriptions.length > 0 ? analysis.toolDescriptions.length : null,
        toolNames: analysis.toolNames,
        capabilityFlags: analysis.capabilityFlags,
        toolInjectionMax: injection.maxScore,
        hasHostedEndpoint: analysis.hostedEndpointHint !== null,
        probeStatus:          probe ? (probe.status as RuntimeSignals['probeStatus']) : null,
        probeLatencyMs:       probe?.latency_ms        ?? null,
        probeDriftFromStatic: probe?.drift_from_static ?? null,
        schemaErrors:         probe?.schema_errors     ?? null,
      }
      const { score, components } = computeRuntimeScore(signals)

      const runtimeStatus =
        analysis.status === 'no_source' ? 'no_source' :
        probe                           ? 'probed'    : 'static_only'
      const updatePayload: Record<string, unknown> = {
        runtime_score:        score,
        runtime_components:   components,
        runtime_status:       runtimeStatus,
        runtime_updated_at:   new Date().toISOString(),
        capability_flags:     analysis.capabilityFlags,
        tool_count:           analysis.toolDescriptions.length || null,
        tool_names:           analysis.toolNames.length > 0 ? analysis.toolNames : null,
        tool_injection_max:   injection.maxScore || null,
        hosted_endpoint:      analysis.hostedEndpointHint,
        endpoint_source:      analysis.endpointSource,
        npm_package:          analysis.npmPackage,
        pypi_package:         analysis.pypiPackage,
      }

      // Tool-description injection ≥ 6 quarantines the row (shared safety semantics).
      // Only raise injection_risk_score if the tool-description scan found a higher score.
      if (injection.injectionDetected) {
        updatePayload.is_quarantined = true
        const newRisk = Math.max(injection.maxScore, row.injection_risk_score ?? 0)
        updatePayload.injection_risk_score = newRisk
        updatePayload.injection_scanned_at = new Date().toISOString()
      }

      const { error: upErr } = await supabase
        .from('mcp_servers')
        .update(updatePayload)
        .eq('id', row.id)
      if (upErr) {
        console.error(`  ${RED}update failed: ${upErr.message}${RESET}`)
        counts.error++
        continue
      }

      counts.scored++
      if (injection.injectionDetected) counts.quarantined++
      const sc = score >= 60 ? GREEN : score >= 40 ? YELLOW : RED
      const flagsStr = analysis.capabilityFlags.length > 0
        ? `${DIM}[${analysis.capabilityFlags.join(',')}]${RESET}`
        : ''
      const tools = analysis.toolDescriptions.length
      const injMark = injection.injectionDetected
        ? ` ${RED}*INJ ${injection.maxScore}*${RESET}`
        : injection.maxScore >= 3 ? ` ${YELLOW}inj=${injection.maxScore}${RESET}` : ''
      console.log(`${DIM}${prefix}${RESET} ${sc}${String(score).padStart(3)}${RESET}  tools=${String(tools).padStart(2)} ${flagsStr}${injMark}  ${parsed.owner}/${parsed.repo}`)
    } catch (err) {
      await checkpoint(supabase, row.id, 'error_transient')
      counts.error++
      console.log(`${RED}${prefix} fatal: ${String(err).slice(0, 100)}  ${parsed.owner}/${parsed.repo}${RESET}`)
    }
  }

  console.log(`\n${BOLD}Done.${RESET}`)
  console.log(`  ${GREEN}scored${RESET}        ${counts.scored}`)
  console.log(`  ${DIM}no_source${RESET}     ${counts.no_source}`)
  console.log(`  ${DIM}not_github${RESET}    ${counts.not_github}`)
  console.log(`  ${RED}error${RESET}         ${counts.error}`)
  console.log(`  ${RED}quarantined${RESET}   ${counts.quarantined}`)
}

async function checkpoint(
  supabase: ReturnType<typeof getServiceClient>,
  id: string,
  status: string,
) {
  await supabase
    .from('mcp_servers')
    .update({ runtime_status: status, runtime_updated_at: new Date().toISOString() })
    .eq('id', id)
}

main().catch((err) => {
  console.error(`${RED}Fatal: ${err}${RESET}`)
  process.exit(1)
})
