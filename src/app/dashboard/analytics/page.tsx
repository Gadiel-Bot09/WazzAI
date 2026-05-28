import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getConversationMetricsAction,
  getMessagesPerDayAction,
  getLeadsByColumnAction,
  getTopContactsAction,
  getWeeklyTrendAction,
} from '@/actions/analytics'
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard'
import { Loader2 } from 'lucide-react'

export const metadata = {
  title: 'Analíticas | WazzAI',
}

const DAYS_BACK = 30

async function AnalyticsDataFetcher() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch all data in parallel
  const [metricsRes, seriesRes, leadsRes, contactsRes, trendRes] = await Promise.all([
    getConversationMetricsAction(DAYS_BACK),
    getMessagesPerDayAction(DAYS_BACK),
    getLeadsByColumnAction(),
    getTopContactsAction(5),
    getWeeklyTrendAction(),
  ])

  // Graceful defaults if any query fails
  return (
    <AnalyticsDashboard
      metrics={metricsRes.success ? metricsRes.data : {
        total_conversations: 0,
        open_conversations: 0,
        pending_conversations: 0,
        closed_conversations: 0,
        ai_resolved: 0,
        avg_resolution_time_min: 0,
        total_messages: 0,
        inbound_messages: 0,
        outbound_messages: 0,
        ai_messages: 0,
      }}
      messageSeries={seriesRes.success ? seriesRes.data : []}
      leadsByColumn={leadsRes.success ? leadsRes.data : []}
      topContacts={contactsRes.success ? contactsRes.data : []}
      weeklyTrend={trendRes.success ? trendRes.data : {
        thisWeek: { messages: 0, conversations: 0 },
        lastWeek: { messages: 0, conversations: 0 },
      }}
      daysBack={DAYS_BACK}
    />
  )
}

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col h-full">
      <Suspense fallback={
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Calculando métricas...</p>
          </div>
        </div>
      }>
        <AnalyticsDataFetcher />
      </Suspense>
    </div>
  )
}
