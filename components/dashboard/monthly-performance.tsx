import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { formatAmount } from '@/lib/utils'
import type { CeoDashboardData } from '@/types/analytics'

export function MonthlyPerformance({ data }: { data: CeoDashboardData }) {
  const globalGoal = Number(data.goals.find(goal => goal.scope === 'global')?.amount ?? 0)
  const globalProgress = globalGoal > 0 ? Math.max(0, Math.min(100, data.month.revenue / globalGoal * 100)) : 0
  return <section aria-label="Performance mensuelle" className="space-y-4">
    <div><h2 className="font-semibold text-gray-900">Performance mensuelle</h2><p className="text-sm text-gray-500">Mois en cours · objectif, vendeurs et sessions live</p></div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Metric label="CA aujourd’hui" value={formatAmount(data.today.revenue)} suffix="FCFA" tone="indigo" />
          <Metric label="CA ce mois" value={formatAmount(data.month.revenue)} suffix="FCFA" tone="indigo" />
          <Metric label="Panier moyen du mois" value={formatAmount(data.month.average_basket)} suffix="FCFA" />
          <Metric label="Bénéfice estimé du mois" value={formatAmount(data.month.estimated_profit)} suffix="FCFA" tone={data.month.estimated_profit >= 0 ? 'green' : 'red'} />
        </div>
        <Card className="p-5">
          <div className="flex flex-wrap justify-between gap-2"><div><p className="text-sm text-gray-500">Objectif mensuel</p><p className="text-lg sm:text-xl font-bold tabular-nums break-words">{globalGoal ? `${formatAmount(data.month.revenue)} / ${formatAmount(globalGoal)} FCFA` : 'Aucun objectif défini'}</p></div><span className="text-2xl font-bold text-indigo-600">{globalGoal ? `${globalProgress.toFixed(1)} %` : null}</span></div>
          <div className="mt-3 h-3 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-indigo-600 rounded-full transition-all" style={{width:`${globalProgress}%`}} /></div>
          {!globalGoal && <Link href="/pilotage" className="inline-flex min-h-11 items-center mt-1 text-sm text-indigo-600">Définir l’objectif</Link>}
        </Card>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Metric label="Commandes du mois" value={String(data.month.total_orders)} />
          <Metric label="Livraisons effectuées" value={String(data.month.delivered_orders)} tone="green" />
          <Metric label="Commandes annulées" value={String(data.month.cancelled_orders)} tone="red" />
          <Metric label="Dépenses du mois" value={formatAmount(data.month.expense_total)} suffix="FCFA" tone="red" />
        </div>
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <Card><div className="px-4 sm:px-6 py-4 border-b border-gray-100"><h2 className="font-semibold">Classement des vendeurs</h2></div><div className="divide-y divide-gray-100">{data.sellerPerformance.length===0?<p className="p-8 text-center text-sm text-gray-500">Aucune vente livrée ce mois-ci.</p>:data.sellerPerformance.map(s=><div key={s.seller_id} className="p-4 flex flex-wrap items-center gap-3"><span className="w-8 h-8 shrink-0 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">{s.rank}</span><div className="flex-1 min-w-32"><p className="font-medium truncate">{s.seller_name}</p><p className="text-xs text-gray-500">{s.order_count} commandes · panier {formatAmount(s.average_basket)} FCFA</p><div className="mt-1 h-1.5 bg-gray-100 rounded"><div className="h-full bg-indigo-500 rounded" style={{width:`${s.progress}%`}}/></div></div><strong className="text-sm">{formatAmount(s.revenue)} FCFA</strong></div>)}</div></Card>
        <Card><div className="px-4 sm:px-6 py-4 border-b border-gray-100"><h2 className="font-semibold">Performance des créneaux live</h2></div><div className="grid sm:grid-cols-3 gap-3 p-4">{data.slotPerformance.map(s=><div key={s.slot} className={`rounded-xl border p-4 ${s.is_best?'border-green-300 bg-green-50':'border-gray-100'}`}><p className="text-sm text-gray-500">{s.slot==='morning'?'Matin':s.slot==='afternoon'?'Après-midi':'Soir'} {s.is_best && <span className="text-green-700">· Meilleur créneau</span>}</p><p className="text-lg font-bold mt-1">{formatAmount(s.revenue)} FCFA</p><p className="text-xs text-gray-500">{s.order_count} commandes</p></div>)}</div><div className="px-4 pb-4 divide-y divide-gray-100">{data.livePerformance.slice(0,5).map(l=><div key={l.live_session_id} className="py-2 flex flex-wrap justify-between gap-2 text-sm"><span>{l.name} · {l.session_date}</span><strong>{formatAmount(l.revenue)} FCFA</strong></div>)}</div></Card>
      </div>

  </section>
}

function Metric({ label, value, suffix, tone = 'default' }: { label: string; value: string; suffix?: string; tone?: 'default' | 'indigo' | 'green' | 'red' }) {
  const colors = { default: 'text-gray-900', indigo: 'text-indigo-600', green: 'text-green-600', red: 'text-red-600' }
  return <Card className="min-w-0 p-4"><p className="text-xs text-gray-500">{label}</p><p className={`mt-2 text-lg sm:text-xl font-bold tabular-nums break-words ${colors[tone]}`}>{value} {suffix && <span className="text-xs font-normal text-gray-500">{suffix}</span>}</p></Card>
}
