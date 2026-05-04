import { type NextRequest } from 'next/server'
import { createUserClient, createServiceRoleClient } from '@/lib/supabase-server'

const PAGE_SIZE = 50

export async function GET(request: NextRequest) {
  const userClient = await createUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  const adminEmail = process.env.ADMIN_EMAIL
  if (!user || !adminEmail || user.email !== adminEmail) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const params = request.nextUrl.searchParams
  const before = params.get('before')
  const toolFilter = params.get('tool')
  const apiKeyHash = params.get('api_key_hash')

  const supabase = createServiceRoleClient()

  type AuditLogRow = {
    id: string
    api_key_hash: string
    tool_name: string
    query_params: Record<string, unknown> | null
    result_count: number | null
    result_ids: string[] | null
    client_ip_hash: string | null
    status_code: number | null
    latency_ms: number | null
    responded_at: string
  }

  let query = supabase
    .from('api_query_log')
    .select('id, api_key_hash, tool_name, query_params, result_count, result_ids, client_ip_hash, status_code, latency_ms, responded_at')
    .order('responded_at', { ascending: false })
    .limit(PAGE_SIZE)

  if (before) query = query.lt('responded_at', before)
  if (toolFilter) query = query.eq('tool_name', toolFilter)
  if (apiKeyHash) query = query.eq('api_key_hash', apiKeyHash)

  const { data, error } = await query.returns<AuditLogRow[]>()
  if (error) {
    return Response.json({ error: 'Database error' }, { status: 500 })
  }

  const rows = data ?? []
  const nextCursor = rows.length === PAGE_SIZE
    ? rows[rows.length - 1].responded_at
    : null

  return Response.json({
    logs: rows,
    next_cursor: nextCursor,
    page_size: PAGE_SIZE,
  })
}
