'use client'

import { useSubscription } from '@/hooks/use-subscription'
import { BillingUsageBanner } from '@/components/billing/billing-usage-banner'

import { OnboardingChecklist } from '@/components/onboarding/checklist'
import { useState } from 'react'
import { useAnalytics } from '@/hooks/use-analytics'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { DashboardKpis } from '@/components/dashboard/dashboard-kpis'
import { OrderStatusSummary } from '@/components/dashboard/order-status-summary'
import { MonthlyPerformance } from '@/components/dashboard/monthly-performance'
import { PeriodSelector } from '@/components/dashboard/period-selector'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/auth-store'
import { getPeriodDates, PRESET_LABELS, type DatePreset } from '@/lib/date-periods'
import { exportDashboardToExcel } from '@/lib/dashboard-export'

function getLastName(fullName?: string): string {
  if (!fullName) return ''
  const parts = fullName.trim().split(/\s+/)
  const last = parts[parts.length - 1] ?? ''
  return last ? last.charAt(0).toUpperCase() + last.slice(1) : ''
}

export default function DashboardPage() {
  const { summary } = useSubscription()
  const { profile } = useAuthStore()
  const [preset, setPreset] = useState<DatePreset>('today')
  const [customFrom, setCustomFrom] = useState<string | undefined>()
  const [customTo, setCustomTo] = useState<string | undefined>()
  const [isExporting, setIsExporting] = useState(false)

  const range = (preset === 'custom' && customFrom && customTo)
    ? { dateFrom: customFrom, dateTo: customTo }
    : preset !== 'custom'
    ? getPeriodDates(preset)
    : getPeriodDates('today') // fallback while custom fields are being filled

  const { data, isLoading, error } = useAnalytics(range)

  function handlePeriodChange(p: DatePreset, from?: string, to?: string) {
    setPreset(p)
    setCustomFrom(from)
    setCustomTo(to)
  }

  const periodLabel = preset === 'custom' && customFrom && customTo
    ? 'période personnalisée'
    : PRESET_LABELS[preset]

  async function handleExport() {
    if (!data) return
    setIsExporting(true)
    try {
      await exportDashboardToExcel(data, periodLabel, range)
    } finally {
      setIsExporting(false)
    }
  }

  const lastName = getLastName(profile?.full_name)
  const greeting = lastName ? `Bonjour, ${lastName}` : 'Tableau de bord'

  if (isLoading) {
    return (
      <div className="space-y-6">
      <OnboardingChecklist />
      <BillingUsageBanner summary={summary} />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full max-w-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    )
  }

  if (error) return <div className="space-y-6"><OnboardingChecklist />
      <BillingUsageBanner summary={summary} /><Card className="p-8 text-center"><p className="font-semibold text-red-600">Impossible de charger le tableau de bord</p><p className="text-sm text-gray-500 mt-1">{error}</p></Card></div>
  if (!data) return null

  const { stats, revenue } = data

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{greeting}</h1>
          <p className="text-gray-500 text-sm mt-1">
            Bienvenue, voici l&apos;ensemble de votre activité.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          aria-label={isExporting ? "Export en cours" : "Exporter en Excel"}
          title="Exporter en Excel"
          onClick={handleExport}
          disabled={isExporting || !data}
          className="h-11 w-11 shrink-0 p-0 sm:w-auto sm:px-3"
        >
          <svg aria-hidden="true" className="w-5 h-5 sm:mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          <span className="hidden sm:inline">{isExporting ? 'Export...' : 'Exporter en Excel'}</span>
        </Button>
      </div>

      <OnboardingChecklist />
      <BillingUsageBanner summary={summary} />

      <PeriodSelector
        preset={preset}
        customFrom={customFrom}
        customTo={customTo}
        onChange={handlePeriodChange}
      />

      <DashboardKpis stats={stats} />
      <OrderStatusSummary stats={stats} />

      {/* Revenue chart */}
      <Card>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Évolution des ventes · {periodLabel}</h2>
          <span className="hidden sm:inline-flex items-center gap-2 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full bg-indigo-600" /> Ventes
          </span>
        </div>
        <div className="px-6 py-4">
          {revenue.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.5l4.5-4.5 3 3L16.5 6M21 21H4.5A1.5 1.5 0 013 19.5V3" />
                </svg>
              </div>
              <p className="font-semibold text-gray-900">Collecte des données en cours</p>
              <p className="text-sm text-gray-500 mt-1 max-w-md">
                Les statistiques de la période se mettent à jour en temps réel à mesure que vos clients passent commande.
              </p>
            </div>
          ) : (
            <RevenueChart data={revenue} />
          )}
        </div>
      </Card>

      <MonthlyPerformance data={data} />
    </div>
  )
}
