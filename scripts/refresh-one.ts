/**
 * Run the refresh pipeline for a single ecosystem slug.
 * Usage:  SLUG=cursor npx tsx --env-file=.env.local scripts/refresh-one.ts
 */
import { ECOSYSTEMS } from './refresh/ecosystems'
import { fetchAllSources } from './refresh/sources'
import { validateBatch, dedupeNearDuplicates, generateBestPractices, generateBestPracticesHaiku } from './refresh/validate'
import { getServiceClient, urlDedup, writeContent, replaceBestPractices, bestPracticesAreStale } from './refresh/writer'

const SLUG = process.env.SLUG
if (!SLUG) throw new Error('Set SLUG env var')
const eco = ECOSYSTEMS.find(e => e.slug === SLUG)
if (!eco) throw new Error(`No ecosystem with slug '${SLUG}'. Available: ${ECOSYSTEMS.map(e => e.slug).join(', ')}`)

const G = '\x1b[32m', DIM = '\x1b[2m', RESET = '\x1b[0m', RED = '\x1b[31m', YELLOW = '\x1b[33m'

async function main() {
  const supabase = getServiceClient()
  console.log(`\n  Refreshing ${eco!.slug}...\n`)

  const raw = await fetchAllSources(eco!)
  console.log(`${DIM}  fetched   ${RESET}${raw.length} raw items`)

  const fresh = await urlDedup(supabase, eco!.slug, raw)
  const validated = await validateBatch(fresh, eco!.slug)
  const quarantined = validated.filter(i => i.is_quarantined)
  const clean = validated.filter(i => !i.is_quarantined)
  const deduped = await dedupeNearDuplicates(clean)

  if (quarantined.length) console.log(`${YELLOW}  quarantined ${quarantined.length} items${RESET}`)
  console.log(`${DIM}  validated  ${RESET}${deduped.length} passed`)

  const { inserted } = await writeContent(supabase, [...deduped, ...quarantined])
  console.log(`${G}  written   ${RESET}${inserted} items`)

  const stale = await bestPracticesAreStale(supabase, eco!.slug)
  if (stale) {
    const bp = inserted === 0
      ? await generateBestPracticesHaiku(eco!)
      : await generateBestPractices(eco!)
    await replaceBestPractices(supabase, eco!.slug, bp)
    console.log(`${G}  ↻ best practices regenerated${RESET}`)
  }

  // Show final counts
  for (const cat of ['best_practices', 'news', 'integrations'] as const) {
    const { count } = await supabase
      .from('content_items')
      .select('*', { count: 'exact', head: true })
      .eq('ecosystem_slug', eco!.slug)
      .eq('category', cat)
    console.log(`  ${cat.padEnd(15)} ${count ?? 0}`)
  }
}

main().catch(e => { console.error(`${RED}Fatal: ${e}${RESET}`); process.exit(1) })
