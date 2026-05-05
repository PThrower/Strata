// Agent identity credentials — EdDSA (Ed25519) JWT signing and verification.
// Mirrors lib/x402-verifier.ts in role: pure library with no DB writes.
//
// Env vars required:
//   STRATA_AGENT_SIGNING_KEY  — Ed25519 private key, PEM (PKCS#8)
//   STRATA_AGENT_PUBLIC_KEY   — Ed25519 public key, PEM (SubjectPublicKeyInfo)
//
// Generate with:
//   openssl genpkey -algorithm Ed25519 -out strata-agent-private.pem
//   openssl pkey -in strata-agent-private.pem -pubout -out strata-agent-public.pem

import { SignJWT, jwtVerify, importPKCS8, importSPKI, exportJWK } from 'jose'
import type { JWK } from 'jose'

export const ISSUER   = 'https://strata.dev'
export const AUDIENCE = 'mcp'
export const KEY_ID   = 'strata-2026-01'

// ── Key singleton (lazy, cached per process) ──────────────────────────────────

let _private: CryptoKey | null = null
let _public:  CryptoKey | null = null

async function getPrivateKey(): Promise<CryptoKey> {
  if (_private) return _private
  const pem = process.env.STRATA_AGENT_SIGNING_KEY
  if (!pem) throw new Error('STRATA_AGENT_SIGNING_KEY is not set')
  _private = await importPKCS8(pem, 'EdDSA')
  return _private
}

export async function getPublicKey(): Promise<CryptoKey> {
  if (_public) return _public
  const pem = process.env.STRATA_AGENT_PUBLIC_KEY
  if (!pem) throw new Error('STRATA_AGENT_PUBLIC_KEY is not set')
  _public = await importSPKI(pem, 'EdDSA')
  return _public
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AgentIdentityInput {
  id:           string    // agent_identities.id — becomes jti
  agentId:      string    // agent_identities.agent_id — becomes sub
  profileId:    string
  name:         string
  capabilities: string[]
  createdAt:    Date      // becomes iat
  expiresAt:    Date      // becomes exp
}

export interface VerifiedClaims {
  jti:          string
  agentId:      string    // JWT sub
  profileId:    string
  name:         string
  capabilities: string[]
  issuedAt:     string    // ISO
  expiresAt:    string    // ISO
}

export type CredentialError =
  | { error: 'expired';           message: string }
  | { error: 'invalid_signature'; message: string }
  | { error: 'invalid_claims';    message: string }
  | { error: 'keys_not_set';      message: string }

export type VerifyResult = VerifiedClaims | CredentialError

export function isCredentialError(r: VerifyResult): r is CredentialError {
  return 'error' in r
}

// ── Sign ──────────────────────────────────────────────────────────────────────

export async function signCredential(identity: AgentIdentityInput): Promise<string> {
  const key = await getPrivateKey()
  return new SignJWT({
    profile_id:   identity.profileId,
    name:         identity.name,
    capabilities: identity.capabilities,
  })
    .setProtectedHeader({ alg: 'EdDSA', kid: KEY_ID })
    .setSubject(identity.agentId)
    .setJti(identity.id)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(Math.floor(identity.createdAt.getTime() / 1000))
    .setExpirationTime(Math.floor(identity.expiresAt.getTime() / 1000))
    .sign(key)
}

// ── Verify ────────────────────────────────────────────────────────────────────

export async function verifyCredential(jwt: string): Promise<VerifyResult> {
  let key: CryptoKey
  try {
    key = await getPublicKey()
  } catch {
    return { error: 'keys_not_set', message: 'STRATA_AGENT_PUBLIC_KEY is not configured' }
  }

  try {
    const { payload } = await jwtVerify(jwt, key, {
      issuer:     ISSUER,
      audience:   AUDIENCE,
      algorithms: ['EdDSA'],
    })

    if (typeof payload.sub !== 'string' || !payload.sub.startsWith('agt_')) {
      return { error: 'invalid_claims', message: 'sub must be an agt_ agent ID' }
    }
    if (typeof payload.jti !== 'string') {
      return { error: 'invalid_claims', message: 'jti is missing' }
    }
    if (typeof payload.profile_id !== 'string') {
      return { error: 'invalid_claims', message: 'profile_id is missing' }
    }

    return {
      jti:          payload.jti,
      agentId:      payload.sub,
      profileId:    payload.profile_id as string,
      name:         (payload.name as string) ?? '',
      capabilities: Array.isArray(payload.capabilities) ? (payload.capabilities as string[]) : [],
      issuedAt:     new Date(((payload.iat ?? 0) as number) * 1000).toISOString(),
      expiresAt:    new Date(((payload.exp ?? 0) as number) * 1000).toISOString(),
    }
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code === 'ERR_JWT_EXPIRED') {
      return { error: 'expired', message: 'credential has expired' }
    }
    return { error: 'invalid_signature', message: 'signature verification failed' }
  }
}

// ── JWKS ─────────────────────────────────────────────────────────────────────

export async function getJwks(): Promise<{ keys: JWK[] }> {
  const key = await getPublicKey()
  const jwk = await exportJWK(key)
  return {
    keys: [{ ...jwk, use: 'sig', alg: 'EdDSA', kid: KEY_ID }],
  }
}
