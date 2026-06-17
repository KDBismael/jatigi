'use client'

import { useAnalytics } from '@/hooks/use-analytics'
import { StatCard } from '@/components/dashboard/stat-card'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'

export default function DashboardPage() {
  const { data, isLoading } = useAnalytics()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
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
        <p className="text-gray-500 text-sm mt-1">Vue d'ensemble de votre activité</p>
      </div>

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
          <h2 className="font-semibold text-gray-900">Évolution sur 30 jours</h2>
        </CardHeader>
        <CardContent>
          <RevenueChart data={revenue} />
        </CardContent>
      </Card>
    </div>
  )
}
