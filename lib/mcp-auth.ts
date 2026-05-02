import { consumeApiCall, allowIp } from './api-auth'
import type { AuthResult } from './api-auth'

export async function authenticateMcpRequest(req: Request): Promise<AuthResult> {
  // M-7: per-IP rate limit before hitting the DB (mirrors authenticateRequest)
  const ip = (req.headers as Headers).get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
  if (ip && !allowIp(ip)) {
    return {
      ok: false,
      response: Response.json({ error: 'Too many requests' }, { status: 429 }),
    }
  }

  const authHeader = req.headers.get('authorization')
  const apiKey = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.headers.get('x-api-key')

  if (!apiKey) {
    return {
      ok: false,
      response: Response.json({ error: 'Invalid API key' }, { status: 401 }),
    }
  }

  return consumeApiCall(apiKey)
}
