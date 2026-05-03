// Server-Timing helper for response latency observability.
// Use the same `t0 = Date.now()` already captured at the top of route handlers.
//
//   const t0 = Date.now()
//   …
//   return Response.json(body, { headers: { 'Server-Timing': serverTiming(t0) } })
//
// Multiple metrics:
//   const headers = new Headers()
//   headers.set('Server-Timing', `db;dur=${dbMs}, total;dur=${Date.now() - t0}`)
//
// The header is exposed to JS clients in browsers via the
// `PerformanceServerTiming` API, but only when the response also includes
// `Timing-Allow-Origin: *`. We intentionally do NOT set TAO since these
// values can leak performance signals across origins.

export function serverTiming(t0: number, label = 'total'): string {
  return `${label};dur=${Date.now() - t0}`
}
