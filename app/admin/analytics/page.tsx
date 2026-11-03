import { EventReport, REPORT_PERIODS, type ReportPeriod } from '@/components/admin/event-report'
import { getPlatformEventReport } from '@/services/platform-service'

export const dynamic = 'force-dynamic'

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const requested = Number((await searchParams).period)
  const period: ReportPeriod = (REPORT_PERIODS as readonly number[]).includes(requested) ? requested as ReportPeriod : 30
  const report = await getPlatformEventReport(period).catch((error: unknown) => {
    console.error('[/admin/analytics] report failed:', error)
    return null
  })
  if (report) return <EventReport report={report} period={period} />
  return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Analytique</h1>
        <p role="alert" className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
          Le rapport est indisponible. Si la mise à jour n’a pas encore été faite, exécutez <code>docs/deployment/2026-11-03-app-events.sql</code> dans Supabase, puis rechargez la page.
        </p>
      </div>
  )
}
