// Data lineage helpers — pure functions only (no DB writes).
// DB writes happen in app/api/v1/lineage/route.ts via the service-role client.

export type LineageRiskLevel = 'low' | 'medium' | 'high' | 'critical'

export const VALID_DATA_TAGS = new Set(['pii', 'credentials', 'financial', 'internal'])

// Capability flags that warrant critical/high risk when combined with sensitive data.
const DANGEROUS_FLAGS = new Set(['shell_exec', 'dynamic_eval'])
const SENSITIVE_TAGS  = new Set(['pii', 'credentials'])

// Pure risk computation for a lineage flow.
// Source flags are intentionally excluded from the risk score (they're visible in the
// table but don't raise risk level — source taint is a Phase 3 concept).
export function computeLineageRisk(
  destCapabilityFlags: string[],
  dataTags:            string[],
  isDestQuarantined:   boolean,
): LineageRiskLevel {
  const hasDangerous = destCapabilityFlags.some(f => DANGEROUS_FLAGS.has(f))
  const hasNetEgress = destCapabilityFlags.includes('net_egress')
  const hasSensitive = dataTags.some(t => SENSITIVE_TAGS.has(t))

  if (isDestQuarantined)                 return 'critical'
  if (hasDangerous && hasSensitive)      return 'critical'
  if (hasNetEgress  && hasSensitive)     return 'high'
  if (hasNetEgress)                      return 'medium'
  return 'low'
}

// Derive a short display label from a server URL — hostname + first path segment.
export function shortServerLabel(url: string): string {
  try {
    const u = new URL(url)
    const segs = u.pathname.split('/').filter(Boolean)
    return segs.length > 0 ? `${u.hostname}/${segs[0]}` : u.hostname
  } catch {
    return url.length > 50 ? url.slice(0, 47) + '…' : url
  }
}
