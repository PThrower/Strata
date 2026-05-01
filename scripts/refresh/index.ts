import { ECOSYSTEMS } from './ecosystems';
import { fetchAllSources } from './sources';
import { refreshMcpDirectory } from './mcp-directory';
import { validateBatch, dedupeNearDuplicates, generateBestPractices, generateBestPracticesHaiku } from './validate';
import {
  getServiceClient,
  urlDedup,
  writeContent,
  replaceBestPractices,
  bestPracticesAreStale,
} from './writer';
import type { EcosystemSummary } from './types';

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
      const deduped = await dedupeNearDuplicates(validated);
      summary.validated = deduped.length;
      console.log(`${DIM}    validated ${RESET}${deduped.length} passed`)

      const { inserted, errors } = await writeContent(supabase, deduped);
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
  } catch (err) {
    console.log(`${RED}  ✗ mcp-directory FAILED: ${String(err)}${RESET}`)
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
