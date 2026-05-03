// Route-level security helpers. The proxy.ts gateway catches the common
// cases (Content-Length pre-check, UA, rate limit). These helpers cover
// edge cases proxy.ts can't — primarily chunked-encoding requests that
// arrive without a Content-Length header — and shared body parsing.

export type BoundedJsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 413; error: string }

/**
 * Read and JSON-parse a request body with an absolute byte cap. Pre-checks
 * Content-Length when available, then post-checks the actual decoded body
 * size to defend against chunked-encoding bypass.
 *
 * Returns a discriminated union so callers stay typed-error-free without
 * try/catch.
 */
export async function readBoundedJson<T = unknown>(
  request: Request,
  maxBytes: number,
): Promise<BoundedJsonResult<T>> {
  // Pre-check via Content-Length when the client supplied it.
  const cl = parseInt(request.headers.get('content-length') ?? '0', 10)
  if (cl > maxBytes) {
    return { ok: false, status: 413, error: 'Payload too large' }
  }

  let text: string
  try {
    text = await request.text()
  } catch {
    return { ok: false, status: 400, error: 'Failed to read body' }
  }

  // Post-check actual UTF-8 byte length — catches chunked encoding without
  // a declared Content-Length, and clients lying about CL.
  const byteLen = new TextEncoder().encode(text).byteLength
  if (byteLen > maxBytes) {
    return { ok: false, status: 413, error: 'Payload too large' }
  }

  if (text.length === 0) {
    return { ok: false, status: 400, error: 'Empty body' }
  }

  try {
    return { ok: true, data: JSON.parse(text) as T }
  } catch {
    return { ok: false, status: 400, error: 'Invalid JSON' }
  }
}
