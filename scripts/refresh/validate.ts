import Anthropic from '@anthropic-ai/sdk';
import type { EcosystemConfig, RawItem, ValidatedItem } from './types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const VALIDATION_SYSTEM = `You are a content quality validator for Strata, an AI ecosystem intelligence platform.
Your job is to review content items and determine if they are:
1. Genuinely relevant to the specified AI ecosystem
2. Accurate and not misleading
3. Useful to developers building AI applications
4. Not a duplicate or near-duplicate of another item in this batch

Important: Age of content is NOT a rejection criterion. Accept any developer-useful content
regardless of publish date. Only reject items that are irrelevant, inaccurate, non-technical,
or truly low-quality (e.g. pure marketing fluff, memes, personal announcements).

For each item, return a JSON array with objects containing:
- keep: boolean
- reason: brief explanation
- improvedTitle: cleaned up title if needed (or null)
- improvedBody: improved summary if needed, max 300 chars (or null)
- category: best_practices | news | integrations (re-categorize if needed)
- confidence: high | medium | low

Return ONLY a JSON array, no prose.`;

interface ValidationResult {
  keep: boolean;
  reason: string;
  improvedTitle: string | null;
  improvedBody: string | null;
  category: ValidatedItem['category'];
  confidence: 'high' | 'medium' | 'low';
}

async function callClaude(
  messages: Anthropic.Messages.MessageParam[],
  system: string,
  retries = 1,
): Promise<string> {
  try {
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system,
      messages,
    });
    const block = resp.content[0];
    if (block.type !== 'text') throw new Error('Unexpected content block type');
    return block.text;
  } catch (err) {
    const isRetryable =
      err instanceof Anthropic.RateLimitError ||
      err instanceof Anthropic.InternalServerError;
    if (retries > 0 && isRetryable) {
      await new Promise((r) => setTimeout(r, 1000));
      return callClaude(messages, system, retries - 1);
    }
    throw err;
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function validateBatch(
  items: RawItem[],
  ecosystem: string,
): Promise<ValidatedItem[]> {
  if (items.length === 0) return [];

  const validated: ValidatedItem[] = [];
  for (const chunk of chunkArray(items, 20)) {
    const payload = chunk.map((item, i) => ({
      index: i,
      title: item.title,
      body: item.body.slice(0, 600),
      category: item.category,
      sourceType: item.sourceType,
    }));

    let results: ValidationResult[];
    try {
      const text = await callClaude(
        [
          {
            role: 'user',
            content: `Ecosystem: ${ecosystem}\n\nItems:\n${JSON.stringify(payload, null, 2)}`,
          },
        ],
        VALIDATION_SYSTEM,
      );
      // Strip markdown code fences if Claude wraps the JSON
      const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '');
      results = JSON.parse(cleaned) as ValidationResult[];
    } catch (err) {
      console.warn(`  Validation parse error for ${ecosystem} chunk: ${err}`);
      continue;
    }

    for (let i = 0; i < chunk.length; i++) {
      const r = results[i];
      if (!r || !r.keep || r.confidence === 'low') continue;
      validated.push({
        ...chunk[i],
        title: r.improvedTitle ?? chunk[i].title,
        body: r.improvedBody ?? chunk[i].body,
        category: r.category ?? chunk[i].category,
        confidence: r.confidence,
      });
    }
  }
  return validated;
}

export async function dedupeNearDuplicates(
  items: ValidatedItem[],
): Promise<ValidatedItem[]> {
  if (items.length < 2) return items;

  const payload = items.map((item, i) => ({
    index: i,
    title: item.title,
    body: item.body.slice(0, 200),
  }));

  let removeIndices: number[];
  try {
    const text = await callClaude(
      [
        {
          role: 'user',
          content:
            'Identify near-duplicate items that cover the same story or topic. ' +
            'Return a JSON object with a single key "removeIndices" containing an ' +
            'array of indices to remove, keeping the highest quality version of each duplicate. ' +
            'If no duplicates, return {"removeIndices":[]}\n\n' +
            JSON.stringify(payload, null, 2),
        },
      ],
      'You are a deduplication assistant. Return ONLY valid JSON, no prose.',
    );
    const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '');
    const parsed = JSON.parse(cleaned) as { removeIndices: number[] };
    removeIndices = parsed.removeIndices ?? [];
  } catch {
    return items;
  }

  const removeSet = new Set(removeIndices);
  return items.filter((_, i) => !removeSet.has(i));
}

async function generateBestPracticesWithModel(
  eco: EcosystemConfig,
  model: string,
): Promise<ValidatedItem[]> {
  interface BPItem {
    title: string;
    body: string;
  }

  const resp = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    system: 'You are a technical writer for Strata, an AI ecosystem intelligence platform. Return ONLY a JSON array, no prose.',
    messages: [{ role: 'user', content: eco.bestPracticesPrompt }],
  });
  const block = resp.content[0];
  if (block.type !== 'text') throw new Error('Unexpected content block type');
  const cleaned = block.text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '');
  const items = JSON.parse(cleaned) as BPItem[];

  const now = new Date().toISOString();
  return items.slice(0, 3).map((item) => ({
    ecosystem: eco.slug,
    category: 'best_practices' as const,
    title: item.title,
    body: item.body,
    sourceUrl: '',
    publishedAt: now,
    sourceType: 'rss' as const,
    confidence: 'high' as const,
  }));
}

export async function generateBestPractices(
  eco: EcosystemConfig,
): Promise<ValidatedItem[]> {
  return generateBestPracticesWithModel(eco, 'claude-sonnet-4-6');
}

export async function generateBestPracticesHaiku(
  eco: EcosystemConfig,
): Promise<ValidatedItem[]> {
  return generateBestPracticesWithModel(eco, 'claude-haiku-4-5-20251001');
}
