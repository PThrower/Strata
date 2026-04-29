import { consumeApiCall } from './api-auth'
import type { AuthResult } from './api-auth'

export async function authenticateMcpRequest(req: Request): Promise<AuthResult> {
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
