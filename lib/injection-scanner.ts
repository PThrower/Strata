export interface ScanResult {
  hits: string[]
  score: number
}

// U+2028/U+2029 are line terminators in JS regex literals, so we use
// RegExp constructors with \uXXXX strings to build the normalization patterns.
const ZERO_WIDTH_RE = new RegExp(
  '[​-‏ - ﻿­]', 'g',
)
const EXOTIC_SPACE_RE = new RegExp(
  '[  -  　]', 'g',
)

// Preprocessing: strip zero-width/directional characters and normalise
// whitespace variants before regex matching. Catches bypasses like
// inserting U+200B between keyword letters or using non-ASCII whitespace.
function normalize(text: string): string {
  return text
    .normalize('NFKC')
    .replace(ZERO_WIDTH_RE, '')
    .replace(EXOTIC_SPACE_RE, ' ')
}

// Each pattern carries an explicit weight rather than contributing a flat 2
// points. score = sum-of-weights, clamped to 10.
//
// Thresholds (checked at call sites):
//   score >= 6  -> quarantine (is_quarantined = true, no Layer-2 needed)
//   score >= 3  -> escalate to Layer-2 semantic check
//
// Weight rationale:
//   8 -- near-certain injection; one hit quarantines alone (~zero false positives)
//   6 -- very high signal; one hit quarantines alone (rare legitimate occurrence)
//   4 -- suspicious; triggers Layer-2 but not standalone quarantine
//   3 -- weak signal; triggers Layer-2; needs 2 hits to quarantine
const INJECTION_PATTERNS: { rx: RegExp; weight: number }[] = [

  // ---- Weight 8: near-certain injection ------------------------------------

  // XML role tags that switch the model's persona/context
  { rx: /<\/?(system|assistant|user)\b/i, weight: 8 },
  // LLaMA / Mistral / HuggingFace bracket-style role tokens
  { rx: /\[\/?(INST|SYS|SYSTEM|HUMAN|ASSISTANT)\]/i, weight: 8 },
  // Core "ignore previous instructions" -- punctuation-tolerant.
  // [\s\W]+ catches dashes, dots, commas used in place of spaces.
  { rx: /\bignore[\s\W]+(?:(?:all|the|these|those|any|prior|previous|above)[\s\W]+)?(?:previous|above|prior|earlier|existing)[\s\W]+(?:instructions?|prompts?|rules?|directives?|guidelines?|constraints?)\b/i, weight: 8 },
  // Credential / secret extraction attempts
  { rx: /\b(?:reveal|print|output|show|leak|expose)\b[\s\S]{0,40}\b(?:system\s+prompt|api[\s_-]?key|secret|credentials?|password|auth[\s_-]?token)\b/i, weight: 8 },

  // ---- Weight 6: very high signal -----------------------------------------

  { rx: /\bdisregard[\s\W]+(?:(?:the|all|previous|prior|everything)[\s\W]+)?(?:above|previous|prior|instructions?|rules?|directives?)\b/i, weight: 6 },
  { rx: /\bnew\s+instructions?\s*:/i, weight: 6 },
  { rx: /###\s*(?:new\s+)?instructions?\b/i, weight: 6 },
  // "you are now a ..." role-switch; negative lookahead avoids "you are now able to"
  { rx: /\byou\s+are\s+now\s+(?:a\s+|an\s+)(?!able\b)/i, weight: 6 },
  { rx: /\bforget\b[\s\S]{0,30}\b(?:instructions?|rules?|everything|system\s+prompt|guidelines?|constraints?)\b/i, weight: 6 },

  // ---- Weight 4: suspicious -- triggers Layer-2 ---------------------------

  { rx: /\b(?:override|circumvent|bypass)\b[\s\S]{0,30}\b(?:instructions?|rules?|guidelines?|safety|restrictions?|constraints?)\b/i, weight: 4 },
  // "act as an interface/API/proxy/middleware" is legitimate; exclude it
  { rx: /\bact\s+as\s+(?:a\s+|an\s+)(?!interface\b|API\b|proxy\b|middleware\b)/i, weight: 4 },
  { rx: /\byour\s+new\s+(?:instruction|role|task|identity|system\s+prompt)\b/i, weight: 4 },
  { rx: /\bpretend\s+(?:you\s+are|to\s+be)\b/i, weight: 4 },
  { rx: /\[.*?\]\(javascript:/i, weight: 4 },
  { rx: /\brespond\s+as\s+(?:if\s+you\s+(?:are|were)|a\s+|an\s+)/i, weight: 4 },
  { rx: /\bfrom\s+now\s+on\b[\s\S]{0,30}\b(?:you\s+(?:are|will|must|shall)|respond|ignore|forget|act)\b/i, weight: 4 },

  // ---- Weight 3: weak signals -- trigger Layer-2; need 2+ to quarantine ---

  // Common in legitimate LLM-discourse content; low weight avoids false positives
  { rx: /\bjailbreak\b|DAN\s+mode\b/i, weight: 3 },
  { rx: /\bsystem\s+prompt\b/i, weight: 3 },
  { rx: /\bno\s+longer\b[\s\S]{0,30}\b(?:bound|constrained|restricted)\b/i, weight: 3 },
  { rx: /\bstop\s+(?:following|obeying)\b[\s\S]{0,20}\b(?:instructions?|rules?|guidelines?)\b/i, weight: 3 },
  { rx: /\bhenceforth\b/i, weight: 3 },
]

export function scanForInjection(text: string): ScanResult {
  const normalised = normalize(text)
  const hits: string[] = []
  let score = 0
  for (const { rx, weight } of INJECTION_PATTERNS) {
    const match = normalised.match(rx)
    if (match) {
      hits.push(match[0])
      score += weight
    }
  }
  return { hits, score: Math.min(10, score) }
}
