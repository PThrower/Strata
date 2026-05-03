/**
 * Rescore a sample of 20 unscored mcp_servers rows to demonstrate the
 * improved static parser (object-literal tool pattern) is extracting more.
 * Mirrors the runtime block in scripts/refresh/index.ts but on a fixed sample.
 *
 * Run:  npx tsx --env-file=.env.local scripts/rescore-runtime-sample.ts
 */
import Anthropic from '@anthropic-ai/sdk'
import { getServiceClient } from './refresh/writer'
import { parseGitHubUrl, RateLimiter } from './refresh/github-security'
import { analyzeRepoStatic } from './refresh/runtime-static'
import { scanToolDescriptions } from './refresh/runtime-tool-injection'
import { computeRuntimeScore } from './refresh/runtime-score'

const SAMPLE = 20

async function main() {
  const sb = getServiceClient()
  const limiter = new RateLimiter()
  const anthropic = process.env.ANTHROPIC_API_KEY
    ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    : null

  const { data: pool } = await sb.from('mcp_servers')
    .select('id, name, url, injection_risk_score')
    .is('runtime_updated_at', null)
    .order('id')
    .limit(SAMPLE)

  console.log(`Rescoring ${pool?.length ?? 0} rows...\n`)

  let extracted = 0
  let scored = 0
  let stillNoTool = 0
  type Row = { id: string; name: string; url: string | null; injection_risk_score: number | null }
  for (const row of (pool ?? []) as Row[]) {
    const parsed = row.url ? parseGitHubUrl(row.url) : null
    if (!parsed) {
      await sb.from('mcp_servers').update({
        runtime_status: 'no_source', runtime_updated_at: new Date().toISOString(),
      }).eq('id', row.id)
      console.log(`  ${row.name.slice(0, 30).padEnd(30)} no-source`)
      continue
    }
    try {
      const analysis = await analyzeRepoStatic(parsed.owner, parsed.repo, limiter)
      if (analysis.status === 'error_transient' || analysis.status === 'error_permanent') {
        await sb.from('mcp_servers').update({
          runtime_status: analysis.status, runtime_updated_at: new Date().toISOString(),
        }).eq('id', row.id)
        console.log(`  ${row.name.slice(0, 30).padEnd(30)} ${analysis.status}`)
        continue
      }
      const injection = await scanToolDescriptions(analysis.toolDescriptions, anthropic)
      const { score, components } = computeRuntimeScore({
        toolCount: analysis.toolDescriptions.length || null,
        toolNames: analysis.toolNames,
        capabilityFlags: analysis.capabilityFlags,
        toolInjectionMax: injection.maxScore,
        hasHostedEndpoint: analysis.hostedEndpointHint !== null,
        probeStatus: null, probeLatencyMs: null,
        probeDriftFromStatic: null, schemaErrors: null,
      })
      const tc = analysis.toolDescriptions.length
      const update: Record<string, unknown> = {
        runtime_score: score, runtime_components: components,
        runtime_status: 'static_only',
        runtime_updated_at: new Date().toISOString(),
        capability_flags: analysis.capabilityFlags,
        tool_count: tc || null,
        tool_names: analysis.toolNames.length > 0 ? analysis.toolNames : null,
        tool_injection_max: injection.maxScore || null,
        hosted_endpoint: analysis.hostedEndpointHint,
        endpoint_source: analysis.endpointSource,
        npm_package: analysis.npmPackage,
        pypi_package: analysis.pypiPackage,
      }
      if (injection.injectionDetected) {
        update.is_quarantined = true
        update.injection_risk_score = Math.max(injection.maxScore, row.injection_risk_score ?? 0)
        update.injection_scanned_at = new Date().toISOString()
      }
      await sb.from('mcp_servers').update(update).eq('id', row.id)
      scored++
      if (tc > 0) extracted++
      else stillNoTool++
      console.log(`  ${row.name.slice(0, 30).padEnd(30)} score=${score} tools=${tc} caps=[${analysis.capabilityFlags.join(',')}]`)
    } catch (err) {
      console.log(`  ${row.name.slice(0, 30).padEnd(30)} error: ${String(err).slice(0, 60)}`)
    }
  }

  console.log(`\nScored: ${scored} / ${pool?.length ?? 0}`)
  console.log(`Tools successfully extracted: ${extracted}`)
  console.log(`Still no tools extracted: ${stillNoTool}`)
}

main().catch(e => { console.error(e); process.exit(1) })
