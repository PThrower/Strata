import { getServiceClient } from './writer'

const AWESOME_MCP_URL =
  'https://raw.githubusercontent.com/punkpeye/awesome-mcp-servers/main/README.md'

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings'
const BATCH_SIZE = 128

type VoyageResponse = {
  data: { embedding: number[]; index: number }[]
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const res = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({ input: texts, model: 'voyage-3' }),
  })
  if (!res.ok) throw new Error(`Voyage embed failed: ${res.status} ${await res.text()}`)
  const json: VoyageResponse = await res.json()
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding)
}

interface McpEntry {
  name: string
  url: string
  description: string
  category: string
  source: string
}

// Strip emoji and normalize whitespace from a heading string
function normalizeCategory(heading: string): string {
  return heading
    .replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{2BFF}]|[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseAwesomeMcpReadme(markdown: string): McpEntry[] {
  const entries: McpEntry[] = []
  let currentCategory = 'General'

  for (const line of markdown.split('\n')) {
    if (line.startsWith('## ')) {
      currentCategory = normalizeCategory(line.slice(3))
      continue
    }

    // Match: - [Name](url) - description  (dash or em-dash separator)
    const match = line.match(/^[-*]\s+\[([^\]]+)\]\(([^)]+)\)(?:\s*[–—-]\s*(.*))?/)
    if (!match) continue

    const [, name, url, description = ''] = match
    if (!url.startsWith('http')) continue

    entries.push({
      name: name.trim(),
      url: url.trim(),
      description: description.trim(),
      category: currentCategory,
      source: 'awesome-mcp-servers',
    })
  }

  return entries
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export async function refreshMcpDirectory(): Promise<{ upserted: number; errors: string[] }> {
  const supabase = getServiceClient()

  // Fetch README
  const res = await fetch(AWESOME_MCP_URL)
  if (!res.ok) throw new Error(`Failed to fetch awesome-mcp-servers README: ${res.status}`)
  const markdown = await res.text()

  const entries = parseAwesomeMcpReadme(markdown)
  if (entries.length === 0) throw new Error('Parsed 0 entries — README format may have changed')

  // Find URLs already in DB to avoid re-embedding unchanged entries
  const { data: existing } = await supabase
    .from('mcp_servers')
    .select('url')
    .not('url', 'is', null)

  const existingUrls = new Set((existing ?? []).map((r: { url: string }) => r.url))
  const newEntries = entries.filter((e) => !existingUrls.has(e.url))

  if (newEntries.length === 0) {
    return { upserted: 0, errors: [] }
  }

  // Generate embeddings in batches
  const texts = newEntries.map((e) =>
    `${e.name}: ${e.description || 'MCP server for ' + e.category}`
  )

  const embeddings: number[][] = []
  const batches = chunk(texts, BATCH_SIZE)
  for (let i = 0; i < batches.length; i++) {
    embeddings.push(...await embedBatch(batches[i]))
    if (i < batches.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  // Upsert rows (conflict on URL)
  const rows = newEntries.map((e, i) => ({
    name: e.name,
    description: e.description || null,
    url: e.url,
    category: e.category,
    source: e.source,
    tags: [] as string[],
    embedding: embeddings[i],
    updated_at: new Date().toISOString(),
  }))

  const errors: string[] = []
  let upserted = 0

  for (const batch of chunk(rows, 50)) {
    const { error, count } = await supabase
      .from('mcp_servers')
      .upsert(batch, { onConflict: 'url', count: 'exact' })
    if (error) {
      errors.push(error.message)
    } else {
      upserted += count ?? batch.length
    }
  }

  return { upserted, errors }
}
