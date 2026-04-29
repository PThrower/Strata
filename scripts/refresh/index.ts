import { ECOSYSTEMS } from './ecosystems';
import { fetchAllSources } from './sources';
import { validateBatch, dedupeNearDuplicates, generateBestPractices } from './validate';
import {
  getServiceClient,
  urlDedup,
  writeContent,
  replaceBestPractices,
  bestPracticesAreStale,
} from './writer';
import type { EcosystemSummary } from './types';

async function main() {
  const supabase = getServiceClient();
  const summaries: EcosystemSummary[] = [];

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
      const raw = await fetchAllSources(eco);
      summary.fetched = raw.length;

      const fresh = await urlDedup(supabase, eco.slug, raw);
      summary.newAfterUrlDedup = fresh.length;

      const validated = await validateBatch(fresh, eco.slug);
      const deduped = await dedupeNearDuplicates(validated);
      summary.validated = deduped.length;

      const { inserted, errors } = await writeContent(supabase, deduped);
      summary.written = inserted;
      if (errors.length > 0) summary.errors.push(...errors);

      const stale = await bestPracticesAreStale(supabase, eco.slug);
      if (stale) {
        const bp = await generateBestPractices(eco);
        await replaceBestPractices(supabase, eco.slug, bp);
        summary.bestPracticesRegen = true;
      }
    } catch (err) {
      summary.errors.push(String(err));
      console.error(`[${eco.slug}] FAILED: ${err}`);
    }

    summaries.push(summary);

    const bpTag = summary.bestPracticesRegen ? ' (+BP regen)' : '';
    const errTag = summary.errors.length > 0 ? ` ⚠ ${summary.errors.length} error(s)` : '';
    console.log(
      `[${eco.slug}] Fetched ${summary.fetched} → ` +
        `${summary.newAfterUrlDedup} new after dedup → ` +
        `${summary.validated} validated by Claude → ` +
        `${summary.written} written${bpTag}${errTag}`,
    );
  }

  console.log('\n=== Summary ===');
  console.table(
    summaries.map((s) => ({
      slug: s.slug,
      fetched: s.fetched,
      newAfterDedup: s.newAfterUrlDedup,
      validated: s.validated,
      written: s.written,
      bpRegen: s.bestPracticesRegen,
      ok: s.errors.length === 0,
    })),
  );

  const allFailed = summaries.every((s) => s.errors.length > 0 && s.written === 0);
  process.exit(allFailed ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
