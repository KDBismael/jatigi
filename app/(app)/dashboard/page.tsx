'use client'

import { useState } from 'react'
import { useAnalytics } from '@/hooks/use-analytics'
import { StatCard } from '@/components/dashboard/stat-card'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { PeriodSelector } from '@/components/dashboard/period-selector'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'
import { getPeriodDates, PRESET_LABELS, type DatePreset } from '@/lib/date-periods'

export default function DashboardPage() {
  const [preset, setPreset] = useState<DatePreset>('today')
  const [customFrom, setCustomFrom] = useState<string | undefined>()
  const [customTo, setCustomTo] = useState<string | undefined>()

  const range = (preset === 'custom' && customFrom && customTo)
    ? { dateFrom: customFrom, dateTo: customTo }
    : preset !== 'custom'
    ? getPeriodDates(preset)
    : getPeriodDates('today') // fallback while custom fields are being filled

  const { data, isLoading } = useAnalytics(range)

  function handlePeriodChange(p: DatePreset, from?: string, to?: string) {
    setPreset(p)
    setCustomFrom(from)
    setCustomTo(to)
  }

  const periodLabel = preset === 'custom' && customFrom && customTo
    ? `${customFrom} → ${customTo}`
    : PRESET_LABELS[preset]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full max-w-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    )
  }

  if (!data) return null

  const { stats, revenue } = data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500 text-sm mt-1">Vue d&apos;ensemble de votre activité</p>
      </div>

      <PeriodSelector
        preset={preset}
        customFrom={customFrom}
        customTo={customTo}
        onChange={handlePeriodChange}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Chiffre d'affaires"
          value={formatCurrency(stats.total_revenue)}
          sub="Commandes livrées"
          accent="blue"
        />
        <StatCard
          label="Bénéfice net"
          value={formatCurrency(stats.net_profit)}
          sub="Après déduction des coûts"
          accent="green"
        />
        <StatCard
          label="Total commandes"
          value={stats.total_orders}
          sub="Toutes statuts"
          accent="blue"
        />
        <StatCard
          label="Livrées"
          value={stats.delivered_orders}
          accent="green"
        />
        <StatCard
          label="En cours"
          value={stats.in_progress_orders}
          accent="yellow"
        />
        <StatCard
          label="Annulées"
          value={stats.cancelled_orders}
          accent="red"
        />
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Évolution — {periodLabel}</h2>
        </CardHeader>
        <CardContent>
          <RevenueChart data={revenue} />
        </CardContent>
      </Card>
    </div>
  )
}
