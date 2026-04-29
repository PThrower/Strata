import { redirect } from 'next/navigation'
import { createUserClient, createServiceRoleClient } from '@/lib/supabase-server'
import { FREE_LIMIT, PRO_LIMIT } from '@/lib/api-auth'
import ApiKeyCard from './_components/api-key-card'
import UpgradeCTA from './_components/upgrade-cta'

type DashboardProfile = {
  id: string
  api_key: string
  tier: string
  calls_used: number
  calls_reset_at: string | null
}

type ApiRequest = {
  id: string
  tool: string
  ecosystem: string
  status_code: number
  created_at: string
}

function formatResetDate(iso: string | null): string {
  if (!iso) return 'N/A'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatRequestTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default async function DashboardPage() {
  const userClient = await createUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()

  if (!user) redirect('/login')

  const serviceClient = createServiceRoleClient()

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('id, api_key, tier, calls_used, calls_reset_at')
    .eq('id', user.id)
    .maybeSingle<DashboardProfile>()

  if (!profile) redirect('/login')

  const { data: recentRequests } = await serviceClient
    .from('api_requests')
    .select('id, tool, ecosystem, status_code, created_at')
    .eq('api_key', profile.api_key)
    .order('created_at', { ascending: false })
    .limit(10)

  const limit = profile.tier === 'pro' ? PRO_LIMIT : FREE_LIMIT
  const pct = Math.min((profile.calls_used / limit) * 100, 100)
  const resetDate = formatResetDate(profile.calls_reset_at)
  const requests = (recentRequests ?? []) as ApiRequest[]

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-2xl font-semibold mb-6">Overview</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs text-gray-500 mb-1">api calls this month</p>
          <p className="text-xl font-semibold tabular-nums">
            {profile.calls_used.toLocaleString()}{' '}
            <span className="text-base font-normal text-gray-400">
              / {limit.toLocaleString()}
            </span>
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs text-gray-500 mb-1">current tier</p>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              profile.tier === 'pro'
                ? 'bg-[#1D9E75]/10 text-[#1D9E75]'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {profile.tier}
          </span>
        </div>
      </div>

      {/* Usage bar */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <p className="text-sm text-gray-500 mb-2">monthly usage</p>
        <div className="w-full bg-gray-100 rounded-full h-2 mb-1.5">
          <div
            style={{ width: `${pct}%` }}
            className="h-2 rounded-full bg-[#1D9E75] transition-all"
          />
        </div>
        <p className="text-xs text-gray-400">resets on: {resetDate}</p>
      </div>

      {/* API Key */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <p className="text-sm font-medium mb-3">api key</p>
        <ApiKeyCard apiKey={profile.api_key} />
      </div>

      {/* Upgrade CTA (free tier only) */}
      {profile.tier === 'free' && (
        <div className="bg-white rounded-lg border p-4 mb-6">
          <UpgradeCTA />
        </div>
      )}

      {/* Recent Requests */}
      <div className="bg-white rounded-lg border p-4">
        <p className="text-sm font-medium mb-3">recent requests</p>
        {requests.length === 0 ? (
          <p className="text-sm text-gray-400">
            no api calls yet — check the docs to get started
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b">
                <th className="text-left pb-2 font-medium">time</th>
                <th className="text-left pb-2 font-medium">tool</th>
                <th className="text-left pb-2 font-medium">ecosystem</th>
                <th className="text-left pb-2 font-medium">status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} className="border-b last:border-0">
                  <td className="py-2 text-gray-500 text-xs tabular-nums">
                    {formatRequestTime(req.created_at)}
                  </td>
                  <td className="py-2 font-mono text-xs">{req.tool}</td>
                  <td className="py-2 font-mono text-xs">{req.ecosystem}</td>
                  <td className="py-2">
                    <span
                      className={`text-xs ${
                        req.status_code < 400
                          ? 'text-[#1D9E75]'
                          : 'text-red-500'
                      }`}
                    >
                      ● {req.status_code}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
