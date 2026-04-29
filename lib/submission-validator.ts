import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM = `You are a content quality validator for Strata, an AI ecosystem intelligence platform used by developers. Review submitted content and assess its quality.

Evaluate based on:
1. Genuine relevance to the stated AI ecosystem and category
2. Accuracy — not misleading or outdated
3. Usefulness to developers building AI applications
4. Not spam, promotional, or low-effort content
5. Appropriate length and detail

Return ONLY a JSON object:
{
  "confidence": "high" | "medium" | "low",
  "reasoning": "brief explanation under 100 words",
  "improvedTitle": "cleaned title if needed, or null",
  "improvedBody": "improved version if needed (max 300 chars), or null"
}

high = publish automatically
medium = flag for human review
low = reject`

export interface SubmissionInput {
  title: string
  body: string
  sourceUrl?: string
  ecosystem: string
  category: string
}

export interface ValidationResult {
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
  improvedTitle?: string
  improvedBody?: string
  approved: boolean
}

export async function validateSubmission(input: SubmissionInput): Promise<ValidationResult> {
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `Ecosystem: ${input.ecosystem}
Category: ${input.category}
Title: ${input.title}
Body: ${input.body}${input.sourceUrl ? `\nSource URL: ${input.sourceUrl}` : ''}`,
      }],
    })

    const text = msg.content.find(b => b.type === 'text')?.text ?? ''
    const raw = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? '{}') as {
      confidence?: string
      reasoning?: string
      improvedTitle?: string | null
      improvedBody?: string | null
    }

    const VALID = ['high', 'medium', 'low'] as const
    const confidence = VALID.includes(raw.confidence as never)
      ? (raw.confidence as 'high' | 'medium' | 'low')
      : 'medium'

    return {
      confidence,
      reasoning: raw.reasoning ?? '',
      improvedTitle: raw.improvedTitle ?? undefined,
      improvedBody: raw.improvedBody ?? undefined,
      approved: confidence === 'high',
    }
  } catch {
    return {
      confidence: 'medium',
      reasoning: 'Validation service unavailable — flagged for manual review.',
      approved: false,
    }
  }
}
