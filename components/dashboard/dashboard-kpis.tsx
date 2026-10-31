import { Card } from '@/components/ui/card'
import { formatAmount } from '@/lib/utils'
import type { DashboardStats } from '@/types/analytics'

export function DashboardKpis({ stats }: { stats: DashboardStats }) {
  const averageBasket = stats.delivered_orders > 0 ? stats.total_revenue / stats.delivered_orders : 0
  const metrics = [
    { label: 'Chiffre d’affaires', value: stats.total_revenue, note: 'FCFA · commandes livrées', tone: 'text-indigo-600' },
    { label: 'Bénéfice net', value: stats.net_profit, note: 'FCFA · après coûts', tone: stats.net_profit < 0 ? 'text-red-600' : 'text-green-600' },
    { label: 'Panier moyen', value: averageBasket, note: 'FCFA · commandes livrées', tone: 'text-gray-900' },
    { label: 'Total commandes', value: stats.total_orders, note: 'Tous statuts confondus', tone: 'text-gray-900' },
  ]
  return <section aria-label="Indicateurs de la période" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
    {metrics.map(metric => <Card key={metric.label} className="min-w-0 p-3.5 sm:p-5">
      <h2 className="text-xs sm:text-sm text-gray-500">{metric.label}</h2>
      <p className={`mt-2 text-xl sm:text-2xl font-bold tabular-nums break-words ${metric.tone}`}>{formatAmount(metric.value)}</p>
      <p className="mt-1 text-xs text-gray-500">{metric.note}</p>
    </Card>)}
  </section>
}
