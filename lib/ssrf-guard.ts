// SSRF protection for user-supplied URLs fetched by Strata (x402 verifier, MCP prober).
// Blocks private IP ranges, link-local addresses, cloud metadata endpoints, and internal
// hostnames before any outbound request is made.
//
// DNS rebinding residual risk: the DNS check resolves at call time, not at fetch time.
// A TOCTOU window exists but is practically mitigated by the HTTPS-only requirement —
// CAs do not issue certificates for private/RFC-1918 IP addresses.

import { lookup } from 'dns/promises'

const PRIVATE_V4: RegExp[] = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,    // RFC 6598 carrier-grade NAT
  /^224\./,                                          // multicast
  /^240\./,                                          // reserved
]

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.aws.amazon.com',
  'metadata.azure.com',
  'instance-data',              // EC2 legacy alias
])

function isPrivateV4(ip: string): boolean {
  return PRIVATE_V4.some(rx => rx.test(ip))
}

function isPrivateV6(addr: string): boolean {
  const a = addr.toLowerCase()
  return (
    a === '::1'          ||   // loopback
    a.startsWith('fe80:') ||  // link-local
    a.startsWith('fc')   ||   // ULA fc00::/7
    a.startsWith('fd')   ||   // ULA fd00::/8
    a.startsWith('::ffff:')   // IPv4-mapped (e.g. ::ffff:127.0.0.1)
  )
}

// assertPublicHttpsUrl resolves the hostname and rejects if any resolved address
// falls in a private range. Throws an Error with message starting 'SSRF:' on rejection.
// Fails open on DNS resolution errors — network issues shouldn't block all verification.
export async function assertPublicHttpsUrl(url: string): Promise<void> {
  let parsed: URL
  try { parsed = new URL(url) } catch {
    throw new Error('SSRF: invalid URL')
  }
  if (parsed.protocol !== 'https:') throw new Error('SSRF: must be https')

  const hostname = parsed.hostname.toLowerCase()

  // Blocked hostnames and *.internal TLD
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.internal')) {
    throw new Error(`SSRF: blocked host ${hostname}`)
  }

  // IPv6 literal in URL, e.g. https://[::1]/
  if (hostname.startsWith('[')) {
    const v6 = hostname.slice(1, -1)
    if (isPrivateV6(v6)) throw new Error(`SSRF: private IPv6 ${v6}`)
    return
  }

  // Raw IPv4 literal, e.g. https://192.168.1.1/
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    if (isPrivateV4(hostname)) throw new Error(`SSRF: private IPv4 ${hostname}`)
    return
  }

  // Hostname — DNS resolution check
  try {
    const addrs = await lookup(hostname, { all: true })
    for (const { address, family } of addrs) {
      if (family === 4 && isPrivateV4(address))
        throw new Error(`SSRF: ${hostname} resolves to private IP ${address}`)
      if (family === 6 && isPrivateV6(address))
        throw new Error(`SSRF: ${hostname} resolves to private IPv6 ${address}`)
    }
  } catch (err) {
    if ((err as Error).message?.startsWith('SSRF:')) throw err
    // DNS lookup failure — fail open to avoid blocking all verification on transient DNS issues
  }
}
