import Anthropic from '@anthropic-ai/sdk'
import { ECOSYSTEMS } from './ecosystems';
import { fetchAllSources } from './sources';
import { refreshMcpDirectory } from './mcp-directory';
import { validateBatch, dedupeNearDuplicates, generateBestPractices, generateBestPracticesHaiku } from './validate';
import { parseGitHubUrl, RateLimiter } from './github-security';
import { analyzeRepoStatic } from './runtime-static';
import { scanToolDescriptions } from './runtime-tool-injection';
import { computeRuntimeScore } from './runtime-score';
import {
  getServiceClient,
  urlDedup,
  writeContent,
  replaceBestPractices,
  bestPracticesAreStale,
} from './writer';
import type { EcosystemSummary } from './types';

// Cap heavier per-row work to fit the 15-min refresh budget.
// Each row makes ~2 GitHub API calls + up to 12 raw fetches (~10s/row at 750ms baseline).
// Backfill script handles the rest: scripts/score-mcp-runtime.ts
const RUNTIME_BATCH_LIMIT = 30

const G      = '\x1b[38;2;0;196;114m'
const DIM    = '\x1b[2m'
const BOLD   = '\x1b[1m'
const RESET  = '\x1b[0m'
const YELLOW = '\x1b[38;2;245;158;11m'
const RED    = '\x1b[38;2;239;68;68m'
const CYAN   = '\x1b[38;2;6;182;212m'

async function main() {
  const start = Date.now()
  const supabase = getServiceClient();
  const summaries: EcosystemSummary[] = [];

  console.log(`\n${G}${BOLD}  STRATA${RESET} Content Refresh Pipeline`)
  console.log(`${DIM}  ─────────────────────────────────────${RESET}`)
  console.log(`${DIM}  ${new Date().toUTCString()}${RESET}`)
  console.log(`${DIM}  21 ecosystems · twice daily${RESET}\n`)

  for (const eco of ECOSYSTEMS) {
    const summary: EcosystemSummary = {
      slug: eco.slug,
      fetched: 0,
      newAfterUrlDedup: 0,
      validated: 0,
      written: 0,
      bestPracticesRegen: false,
      errors: [],
    };

    try {
      console.log(`\n${CYAN}  ◆ ${eco.slug}${RESET}`)

      const raw = await fetchAllSources(eco);
      summary.fetched = raw.length;
      console.log(`${DIM}    fetched   ${RESET}${raw.length} items`)

      const fresh = await urlDedup(supabase, eco.slug, raw);
      summary.newAfterUrlDedup = fresh.length;

      const validated = await validateBatch(fresh, eco.slug);
      // Quarantined items skip dedup — don't send injection content to Claude again
      const quarantined = validated.filter((i) => i.is_quarantined);
      const clean = validated.filter((i) => !i.is_quarantined);
      const deduped = await dedupeNearDuplicates(clean);
      summary.validated = deduped.length;
      if (quarantined.length > 0) {
        console.log(`${YELLOW}    quarantined ${RESET}${quarantined.length} items (injection detected)`)
      }
      console.log(`${DIM}    validated ${RESET}${deduped.length} passed`)

      const { inserted, errors } = await writeContent(supabase, [...deduped, ...quarantined]);
      summary.written = inserted;
      if (errors.length > 0) summary.errors.push(...errors);
      console.log(`${G}    written   ${RESET}${inserted} to database`)

      const stale = await bestPracticesAreStale(supabase, eco.slug);
      if (stale) {
        if (summary.fetched === 0) {
          console.log(`${DIM}    ↷ bp regen skipped (no new sources)${RESET}`)
        } else {
          const useHaiku = summary.written === 0;
          const bp = useHaiku
            ? await generateBestPracticesHaiku(eco)
            : await generateBestPractices(eco);
          await replaceBestPractices(supabase, eco.slug, bp);
          summary.bestPracticesRegen = true;
          const model = useHaiku ? 'haiku' : 'sonnet';
          console.log(`${G}    ↻ best practices regenerated (${model})${RESET}`)
        }
      }
    } catch (err) {
      summary.errors.push(String(err));
      console.log(`${RED}  ✗ ${eco.slug} FAILED: ${String(err)}${RESET}`)
    }

    summaries.push(summary);
  }

  // ── MCP Directory ─────────────────────────────────────────────
  console.log(`\n${CYAN}  ◆ mcp-directory${RESET}`)
  try {
    const { upserted, errors: mcpErrors } = await refreshMcpDirectory()
    if (mcpErrors.length > 0) {
      console.log(`${RED}    errors    ${mcpErrors.join(', ')}${RESET}`)
    } else {
      console.log(`${G}    upserted  ${RESET}${upserted} servers`)
    }
    // Scoring health check
    const supabase = getServiceClient()
    const { count: unscored } = await supabase
      .from('mcp_servers')
      .select('*', { count: 'exact', head: true })
      .is('score_updated_at', null)
    const { count: scoreErrors } = await supabase
      .from('mcp_servers')
      .select('*', { count: 'exact', head: true })
      .like('score_status', 'error_%')
    if ((unscored ?? 0) > 0) console.log(`${YELLOW}    unscored  ${unscored} servers (run: npx tsx scripts/score-mcp-security.ts)${RESET}`)
    if ((scoreErrors ?? 0) > 0) console.log(`${RED}    score_errors  ${scoreErrors} servers${RESET}`)
  } catch (err) {
    console.log(`${RED}  ✗ mcp-directory FAILED: ${String(err)}${RESET}`)
  }

  // ── MCP Runtime Behavioral Scoring ────────────────────────────
  console.log(`\n${CYAN}  ◆ mcp-runtime${RESET}`)
  try {
    const supabase = getServiceClient()
    const limiter = new RateLimiter()
    const anthropic = process.env.ANTHROPIC_API_KEY
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      : null

    const { data: unscored } = await supabase
      .from('mcp_servers')
      .select('id, url, injection_risk_score')
      .is('runtime_updated_at', null)
      .order('id')
      .limit(RUNTIME_BATCH_LIMIT)

    type Row = { id: string; url: string | null; injection_risk_score: number | null }
    let scored = 0
    let quarantined = 0
    let errors = 0

    for (const row of (unscored ?? []) as Row[]) {
      const parsed = row.url ? parseGitHubUrl(row.url) : null
      if (!parsed) {
        await supabase.from('mcp_servers').update({
          runtime_status: 'no_source',
          runtime_updated_at: new Date().toISOString(),
        }).eq('id', row.id)
        continue
      }
      try {
        const analysis = await analyzeRepoStatic(parsed.owner, parsed.repo, limiter)
        if (analysis.status === 'error_transient' || analysis.status === 'error_permanent') {
          await supabase.from('mcp_servers').update({
            runtime_status: analysis.status,
            runtime_updated_at: new Date().toISOString(),
          }).eq('id', row.id)
          errors++
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
        const update: Record<string, unknown> = {
          runtime_score: score,
          runtime_components: components,
          runtime_status: analysis.status === 'no_source' ? 'no_source' : 'static_only',
          runtime_updated_at: new Date().toISOString(),
          capability_flags: analysis.capabilityFlags,
          tool_count: analysis.toolDescriptions.length || null,
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
          quarantined++
        }
        await supabase.from('mcp_servers').update(update).eq('id', row.id)
        scored++
      } catch {
        await supabase.from('mcp_servers').update({
          runtime_status: 'error_transient',
          runtime_updated_at: new Date().toISOString(),
        }).eq('id', row.id)
        errors++
      }
    }

    if (scored > 0) console.log(`${G}    runtime-scored  ${RESET}${scored} servers`)
    if (quarantined > 0) console.log(`${RED}    quarantined     ${quarantined} (tool-description injection)${RESET}`)
    if (errors > 0) console.log(`${YELLOW}    errors          ${errors}${RESET}`)

    const { count: stillUnscored } = await supabase
      .from('mcp_servers')
      .select('*', { count: 'exact', head: true })
      .is('runtime_updated_at', null)
    if ((stillUnscored ?? 0) > 0) {
      console.log(`${YELLOW}    unscored  ${stillUnscored} servers (run: npx tsx scripts/score-mcp-runtime.ts)${RESET}`)
    }
  } catch (err) {
    console.log(`${RED}  ✗ mcp-runtime FAILED: ${String(err)}${RESET}`)
  }

  // ── Summary table ──────────────────────────────────────────────
  console.log(`\n${G}${BOLD}  Summary${RESET}`)
  console.log(`${DIM}  ┌─────────────────┬─────────┬─────────┬──────────┬──────┐`)
  console.log(`  │ ecosystem       │ fetched │ written │ bp regen │  ok  │`)
  console.log(`  ├─────────────────┼─────────┼─────────┼──────────┼──────┤${RESET}`)

  for (const s of summaries) {
    const ok    = s.errors.length === 0
    const color = ok ? G : RED
    const tick  = ok ? '  ✓  ' : '  ✗  '
    const bp    = s.bestPracticesRegen ? '  ✓  ' : '  –  '
    console.log(
      `  │ ${color}${s.slug.padEnd(15)}${RESET} │ ${String(s.fetched).padStart(7)} │ ${String(s.written).padStart(7)} │ ${bp.padEnd(9)}│${color}${tick}${RESET} │`
    )
  }

  console.log(`${DIM}  └─────────────────┴─────────┴─────────┴──────────┴──────┘${RESET}`)

  // ── Final totals ───────────────────────────────────────────────
  const elapsed      = ((Date.now() - start) / 1000).toFixed(1)
  const totalWritten = summaries.reduce((a, s) => a + s.written, 0)
  const successCount = summaries.filter(s => s.errors.length === 0).length
  const allFailed    = summaries.every(s => s.errors.length > 0 && s.written === 0)

  if (!allFailed) {
    console.log(`\n${G}  ✓${RESET} ${totalWritten} items written across ${successCount}/21 ecosystems`)
    console.log(`${DIM}  Duration: ${elapsed}s${RESET}\n`)
  } else {
    console.log(`\n${RED}  ✗ All ecosystems failed — check credentials${RESET}\n`)
  }

  process.exit(allFailed ? 1 : 0);
}

main().catch((err) => {
  const RED   = '\x1b[38;2;239;68;68m'
  const RESET = '\x1b[0m'
  console.error(`${RED}  ✗ Fatal: ${err}${RESET}`)
  process.exit(1)
});
