import OpenAI from 'openai'

let _client: OpenAI | null = null

function client(): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _client
}

export async function embed(text: string): Promise<number[]> {
  const res = await client().embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return res.data[0].embedding
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  const res = await client().embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  })
  // API returns results in order
  return res.data.sort((a, b) => a.index - b.index).map((d) => d.embedding)
}
