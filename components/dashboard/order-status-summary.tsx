import { Card } from '@/components/ui/card'
import type { DashboardStats } from '@/types/analytics'

export function OrderStatusSummary({ stats }: { stats: DashboardStats }) {
  const statuses = [
    { label: 'Livrées', value: stats.delivered_orders, tone: 'bg-green-600' },
    { label: 'En cours', value: stats.in_progress_orders, tone: 'bg-yellow-600' },
    { label: 'Annulées', value: stats.cancelled_orders, tone: 'bg-red-600' },
  ]
  return <section aria-label="Commandes par statut"><Card className="px-4 py-1">
    <dl>{statuses.map((status, index) => <div key={status.label} className={`flex items-center justify-between gap-3 py-3 text-sm ${index < 2 ? 'border-b border-gray-100' : ''}`}>
      <dt className="flex items-center gap-2.5 text-gray-700"><span aria-hidden="true" className={`h-2 w-2 rounded-full ${status.tone}`} />{status.label}</dt>
      <dd className="font-semibold tabular-nums text-gray-900">{status.value}</dd>
    </div>)}</dl>
  </Card></section>
}
