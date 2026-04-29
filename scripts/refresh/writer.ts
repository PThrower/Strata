import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { RawItem, ValidatedItem } from './types';

// Re-implemented here to avoid importing lib/supabase-server.ts, which pulls in next/headers
export function getServiceClient(): SupabaseClient {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY environment variables',
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function urlDedup(
  supabase: SupabaseClient,
  ecosystem: string,
  items: RawItem[],
): Promise<RawItem[]> {
  if (items.length === 0) return [];

  const { data, error } = await supabase
    .from('content_items')
    .select('source_url')
    .eq('ecosystem_slug', ecosystem)
    .not('source_url', 'is', null);

  if (error) throw new Error(`urlDedup query failed: ${error.message}`);

  const existing = new Set((data ?? []).map((r: { source_url: string }) => r.source_url));
  return items.filter((item) => item.sourceUrl && !existing.has(item.sourceUrl));
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

export async function writeContent(
  supabase: SupabaseClient,
  items: ValidatedItem[],
): Promise<{ inserted: number; errors: string[] }> {
  if (items.length === 0) return { inserted: 0, errors: [] };

  const rows = items.map((item) => ({
    ecosystem_slug: item.ecosystem,
    category: item.category,
    title: item.title,
    body: item.body,
    source_url: item.sourceUrl || null,
    published_at: item.publishedAt,
    is_pro_only: false,
  }));

  let inserted = 0;
  const errors: string[] = [];

  for (const chunk of chunkArray(rows, 50)) {
    const { error, count } = await supabase
      .from('content_items')
      .insert(chunk, { count: 'exact' });
    if (error) {
      errors.push(error.message);
    } else {
      inserted += count ?? chunk.length;
    }
  }

  return { inserted, errors };
}

export async function replaceBestPractices(
  supabase: SupabaseClient,
  ecosystem: string,
  items: ValidatedItem[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('content_items')
    .delete()
    .eq('ecosystem_slug', ecosystem)
    .eq('category', 'best_practices');

  if (deleteError) {
    throw new Error(`BP delete failed for ${ecosystem}: ${deleteError.message}`);
  }

  if (items.length === 0) return;

  const rows = items.map((item) => ({
    ecosystem_slug: item.ecosystem,
    category: 'best_practices' as const,
    title: item.title,
    body: item.body,
    source_url: null,
    published_at: item.publishedAt,
    is_pro_only: false,
  }));

  const { error: insertError } = await supabase.from('content_items').insert(rows);
  if (insertError) {
    throw new Error(`BP insert failed for ${ecosystem}: ${insertError.message}`);
  }
}

export async function bestPracticesAreStale(
  supabase: SupabaseClient,
  ecosystem: string,
): Promise<boolean> {
  const sevenDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from('content_items')
    .select('id', { count: 'exact', head: true })
    .eq('ecosystem_slug', ecosystem)
    .eq('category', 'best_practices')
    .gte('published_at', sevenDaysAgo);

  if (error) throw new Error(`BP staleness check failed: ${error.message}`);
  return (count ?? 0) === 0;
}
