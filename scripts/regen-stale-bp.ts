/**
 * One-shot: regenerate best_practices for ecosystems whose newest BP is older
 * than the 3-day staleness cutoff. Uses the same generators as the refresh
 * pipeline (Haiku when no fresh source items, Sonnet otherwise).
 *
 * Run:  npx tsx --env-file=.env.local scripts/regen-stale-bp.ts
 */
import { ECOSYSTEMS } from './refresh/ecosystems'
import { getServiceClient, replaceBestPractices, bestPracticesAreStale } from './refresh/writer'
import { generateBestPracticesHaiku } from './refresh/validate'

const C = { g: '\x1b[32m', y: '\x1b[33m', r: '\x1b[31m', dim: '\x1b[2m', reset: '\x1b[0m' }

async function main() {
  const sb = getServiceClient()
  const stale: string[] = []
  for (const eco of ECOSYSTEMS) {
    if (await bestPracticesAreStale(sb, eco.slug)) stale.push(eco.slug)
  }
  console.log(`Stale ecosystems (${stale.length}): ${stale.join(', ')}\n`)

  let ok = 0, errs = 0
  for (const slug of stale) {
    const eco = ECOSYSTEMS.find(e => e.slug === slug)!
    try {
      // Use Haiku — these are off-cycle regens, not paired with a refresh run
      const bp = await generateBestPracticesHaiku(eco)
      await replaceBestPractices(sb, slug, bp)
      console.log(`${C.g}  ✓ ${slug}: ${bp.length} BPs regenerated${C.reset}`)
      ok++
    } catch (e) {
      console.log(`${C.r}  ✗ ${slug}: ${String(e)}${C.reset}`)
      errs++
    }
  }
  console.log(`\nDone. ${ok} regenerated, ${errs} failed.`)
}

main().catch(e => { console.error(e); process.exit(1) })
