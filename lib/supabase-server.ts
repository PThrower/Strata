import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Connection pooling: NEXT_PUBLIC_SUPABASE_URL is the PostgREST REST API URL
// (https://<project>.supabase.co), NOT a direct postgres connection string.
// PostgREST sits in front of postgres and operates its own server-side
// connection pool, so high-concurrency Vercel function traffic does not
// open one postgres connection per request.
//
// The Supabase pooler URL (aws-0-<region>.pooler.supabase.com:6543) is for
// `pg`, `postgres-js`, and other drivers using `postgres://` connection
// strings. Switching NEXT_PUBLIC_SUPABASE_URL to a pooler URL would break
// the @supabase/supabase-js client — these are different protocols.
//
// If we ever introduce raw SQL access (e.g. for analytics dashboards using
// `postgres-js`), THAT client should target the pooler URL via a separate
// SUPABASE_POSTGRES_URL env var. The HTTP/PostgREST clients below stay on
// the REST URL.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Bypasses RLS. Used by X-API-Key authenticated routes and Stripe webhooks.
export function createServiceRoleClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

// Reads session from cookies. Used by user-facing routes (e.g. Stripe checkout).
export async function createUserClient() {
  const cookieStore = await cookies()
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Component context — token refresh is handled by middleware
        }
      },
    },
  })
}
