// JWKS endpoint — serves Strata's Ed25519 public key so MCP servers and other
// verifiers can validate agent credentials offline.
//
// Cache-Control is set to allow 5 minutes of edge/CDN caching. This balances
// fast verification against key rotation latency.

import { getJwks } from '@/lib/agent-credentials'

export async function GET() {
  let jwks: Awaited<ReturnType<typeof getJwks>>
  try {
    jwks = await getJwks()
  } catch (err) {
    console.error('[jwks] failed to load public key:', err)
    return Response.json(
      { error: 'JWKS unavailable. Public key not configured.' },
      { status: 503 },
    )
  }

  return Response.json(jwks, {
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      'Content-Type':  'application/jwk-set+json',
    },
  })
}
