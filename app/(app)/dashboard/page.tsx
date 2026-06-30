'use client'

import { useState } from 'react'
import { useAnalytics } from '@/hooks/use-analytics'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { PeriodSelector } from '@/components/dashboard/period-selector'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/auth-store'
import { formatAmount } from '@/lib/utils'
import { getPeriodDates, PRESET_LABELS, type DatePreset } from '@/lib/date-periods'

function getLastName(fullName?: string): string {
  if (!fullName) return ''
  const parts = fullName.trim().split(/\s+/)
  const last = parts[parts.length - 1] ?? ''
  return last ? last.charAt(0).toUpperCase() + last.slice(1) : ''
}

export default function DashboardPage() {
  const { profile } = useAuthStore()
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
    ? 'période personnalisée'
    : PRESET_LABELS[preset]

  const lastName = getLastName(profile?.full_name)
  const greeting = lastName ? `Bonjour, ${lastName}` : 'Tableau de bord'

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full max-w-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
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
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{greeting}</h1>
        <p className="text-gray-500 text-sm mt-1">
          Bienvenue, voici l&apos;ensemble de votre activité.
        </p>
      </div>

      <PeriodSelector
        preset={preset}
        customFrom={customFrom}
        customTo={customTo}
        onChange={handlePeriodChange}
      />

      {/* Primary metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase">Chiffre d&apos;affaires</p>
          <p className="mt-3 text-2xl sm:text-3xl font-bold">
            <span className="text-sm text-gray-400 font-normal mr-1.5 align-middle">FCFA</span>
            <span className="text-indigo-600">{formatAmount(stats.total_revenue)}</span>
          </p>
          <div className="mt-4 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">Commandes livrées</span>
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase">Bénéfice net</p>
          <p className="mt-3 text-2xl sm:text-3xl font-bold">
            <span className="text-sm text-gray-400 font-normal mr-1.5 align-middle">FCFA</span>
            <span className="text-green-600">{formatAmount(stats.net_profit)}</span>
          </p>
          <div className="mt-4 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">Après déduction des coûts</span>
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase">Total commandes</p>
          <p className="mt-3 text-2xl sm:text-3xl font-bold text-gray-900">{stats.total_orders}</p>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">Toutes statuts confondus</span>
            <span className="flex -space-x-1">
              <span className="w-3 h-3 rounded-full bg-indigo-500 ring-2 ring-white" />
              <span className="w-3 h-3 rounded-full bg-green-500 ring-2 ring-white" />
              <span className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-white" />
            </span>
          </div>
        </Card>
      </div>

      {/* Status count cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CountCard
          label="Livrées"
          value={stats.delivered_orders}
          tone="green"
          icon={
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          }
        />
        <CountCard
          label="En cours"
          value={stats.in_progress_orders}
          tone="yellow"
          icon={
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9.75h.008v.008H9V9.75zm6 0h.008v.008H15V9.75zM9 14.25a3.75 3.75 0 006 0M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          }
        />
        <CountCard
          label="Annulées"
          value={stats.cancelled_orders}
          tone="red"
          icon={
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          }
        />
      </div>

      {/* Revenue chart */}
      <Card>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Évolution des ventes — {periodLabel}</h2>
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

      {/* Mobile-only tip card (matches mobile design) */}
      <Card className="lg:hidden p-5 flex items-start gap-4 bg-indigo-50/50 border-indigo-100">
        <div className="w-10 h-10 shrink-0 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.4 14.4 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-gray-900">Conseil du jour</p>
          <p className="text-sm text-gray-500 mt-0.5">
            Le pic d&apos;activité habituel de vos clients est entre 18h et 21h. Pensez à préparer vos expéditions pour demain matin.
          </p>
        </div>
      </Card>
    </div>
  )
}

function CountCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string
  value: number
  tone: 'green' | 'yellow' | 'red'
  icon: React.ReactNode
}) {
  const tones = {
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
  }
  return (
    <Card className="p-5 flex items-center gap-4">
      <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${tones[tone]}`}>
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          {icon}
        </svg>
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
      </div>
    </Card>
  )
}
