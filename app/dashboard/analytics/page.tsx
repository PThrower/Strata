import { redirect } from 'next/navigation'
import { createUserClient } from '@/lib/supabase-server'
import { getAnalytics } from './actions'
import AnalyticsDashboard from './AnalyticsDashboard'

export default async function AnalyticsPage() {
  const userClient = await createUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()

  if (!user) redirect('/login')

  const data = await getAnalytics(30)

  return <AnalyticsDashboard initialData={data} />
}
