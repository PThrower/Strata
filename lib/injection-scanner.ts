export interface ScanResult {
  hits: string[]
  score: number
}

// Patterns that are high-signal indicators of prompt injection attempts.
// Ordered from most specific (multi-word) to least to reduce false-positives.
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+|the\s+)?(previous|above)\s+(instruction|instructions|prompt|prompts|rules?)/i,
  /disregard\s+(the\s+|all\s+|previous\s+)?(above|previous|instructions?|rules?)/i,
  /your\s+new\s+(instruction|instructions|role|task|system\s+prompt)/i,
  /new\s+instruction[s]?\s*:/i,
  /you\s+are\s+now\s+(a\s+|an\s+)(?!able)/i,
  /act\s+as\s+(a\s+|an\s+)(?!interface|API|proxy|middleware)/i,
  /###\s*new\s*instructions?/i,
  /<\/?(system|assistant|user)\b/i,
  /\[.*?\]\(javascript:/i,
  /\bsystem\s+prompt\b/i,
  /\bpretend\s+(you\s+are|to\s+be)\b/i,
  /\bforget\s+(everything|all|your\s+previous)\b/i,
]

export function scanForInjection(text: string): ScanResult {
  const hits: string[] = []
  for (const pattern of INJECTION_PATTERNS) {
    const match = text.match(pattern)
    if (match) hits.push(match[0])
  }
  return {
    hits,
    score: Math.min(10, hits.length * 2),
  }
}
