import { getPlatformOverview } from '@/services/platform-service'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { Card } from '@/components/ui/card'
import { formatAmount, formatCurrency } from '@/lib/utils'
import { STATUS_LABELS, STATUS_COLORS, STATUSES } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export default async function AdminOverviewPage() {
  const o = await getPlatformOverview()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Vue d’ensemble de la plateforme</h1>
        <p className="text-gray-500 text-sm mt-1">Synthèse de toute l’activité Warko, toutes organisations confondues.</p>
      </div>

      {/* Primary financials */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MoneyCard label="Chiffre d’affaires" value={o.total_revenue} tone="indigo" hint="Commandes livrées" />
        <MoneyCard label="Bénéfice net" value={o.net_profit} tone="green" hint="Après déduction des coûts" />
        <MoneyCard label="Collecté via livraisons" value={o.delivery_collected} tone="gray" hint="Montant encaissé par les livreurs" />
      </div>

      {/* Counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <CountCard label="Organisations" value={o.organizations_count} />
        <CountCard label="Utilisateurs" value={o.users_count} sub={`${o.owners} propriétaire(s)`} />
        <CountCard label="Commandes" value={o.orders_total} />
        <CountCard label="Livreurs actifs" value={o.active_drivers} />
      </div>

      {/* Delivery money breakdown */}
      <Card className="p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Reversements des livreurs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MiniStat label="Collecté" value={o.delivery_collected} tone="text-gray-900" />
          <MiniStat label="Déjà reversé" value={o.delivery_remitted} tone="text-green-600" />
          <MiniStat label="Reste à reverser" value={o.delivery_due} tone="text-indigo-600" />
        </div>
      </Card>

      {/* Orders by status */}
      <Card className="p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Commandes par statut</h2>
        <div className="flex flex-wrap gap-3">
          {STATUSES.map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[s]}`}>
                {STATUS_LABELS[s]}
              </span>
              <span className="text-sm font-semibold text-gray-900">{o.orders_by_status[s]}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Revenue over time */}
      <Card>
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Évolution du chiffre d’affaires</h2>
        </div>
        <div className="px-6 py-4">
          {o.revenue_series.length === 0 ? (
            <p className="text-center text-gray-400 py-12">Pas encore de ventes livrées.</p>
          ) : (
            <RevenueChart data={o.revenue_series} />
          )}
        </div>
      </Card>
    </div>
  )
}

function MoneyCard({ label, value, tone, hint }: { label: string; value: number; tone: 'indigo' | 'green' | 'gray'; hint: string }) {
  const colors = { indigo: 'text-indigo-600', green: 'text-green-600', gray: 'text-gray-900' }
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase">{label}</p>
      <p className="mt-3 text-2xl sm:text-3xl font-bold">
        <span className="text-sm text-gray-400 font-normal mr-1.5 align-middle">FCFA</span>
        <span className={colors[tone]}>{formatAmount(value)}</span>
      </p>
      <div className="mt-4 pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-400">{hint}</span>
      </div>
    </Card>
  )
}

function CountCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </Card>
  )
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${tone}`}>{formatCurrency(value)}</p>
    </div>
  )
}
