const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings'
const VOYAGE_MODEL = 'voyage-3'

type VoyageResponse = {
  data: { embedding: number[]; index: number }[]
}

async function voyageEmbed(inputs: string[]): Promise<number[][]> {
  const res = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({ input: inputs, model: VOYAGE_MODEL }),
  })
  if (!res.ok) throw new Error(`Voyage embed failed: ${res.status} ${await res.text()}`)
  const json: VoyageResponse = await res.json()
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding)
}

export async function embed(text: string): Promise<number[]> {
  const [embedding] = await voyageEmbed([text])
  return embedding
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  return voyageEmbed(texts)
}
