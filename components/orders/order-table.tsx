'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Order } from '@/types/order'
import type { OrderStatus } from '@/lib/constants'
import { STATUSES, STATUS_LABELS, CHANNEL_LABELS } from '@/lib/constants'
import { OrderStatusBadge } from './order-status-badge'
import { formatDate, formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { MobileMetric, MobileRecordCard } from '@/components/ui/mobile-record-card'
import { orderTotal } from '@/lib/order-amounts'

interface OrderTableProps {
  orders: Order[]
  onStatusChange: (id: string, status: OrderStatus) => Promise<void>
}

export function OrderTable({ orders, onStatusChange }: OrderTableProps) {
  const [updating, setUpdating] = useState<string | null>(null)
  const router = useRouter()
  const isAdmin = useAuthStore((s) => s.isAdmin())

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        Aucune commande trouvée.
      </div>
    )
  }

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>, id: string) {
    e.stopPropagation()
    setUpdating(id)
    try {
      await onStatusChange(id, e.target.value as OrderStatus)
    } finally {
      setUpdating(null)
    }
  }

  return (
    <>
    <div className="space-y-3 sm:hidden">
      {orders.map(order => { const parcel=orderTotal(order.order_lines ?? []); return <MobileRecordCard key={order.id} onClick={()=>router.push(`/orders/${order.id}`)}>
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold text-gray-900">{order.client_name}</p><p className="text-xs text-gray-500">{order.client_phone||'Sans contact'} · {formatDate(order.order_date)}</p></div><OrderStatusBadge status={order.status}/></div>
        <div className="mt-4 grid grid-cols-2 gap-3"><MobileMetric label="Canal" value={CHANNEL_LABELS[order.channel]}/><MobileMetric label="Montant" value={isAdmin?formatCurrency(parcel+(order.delivery_fee??0)):`${order.order_lines?.reduce((s,l)=>s+l.quantity,0)??0} article(s)`}/><MobileMetric label="Livreur" value={order.delivery_driver?.name??'Non assigné'}/><MobileMetric label="Adresse" value={<span className="line-clamp-1">{order.delivery_location||'Non renseignée'}</span>}/></div>
        <div className="mt-4 border-t border-gray-100 pt-3" onClick={e=>e.stopPropagation()}><label className="sr-only" htmlFor={`status-${order.id}`}>Statut</label><select id={`status-${order.id}`} value={order.status} disabled={updating===order.id} onChange={e=>handleStatusChange(e,order.id)} className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500">{STATUSES.map(s=><option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</select></div>
      </MobileRecordCard>})}
    </div>
    <div className="hidden sm:block overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="pb-3 pr-4 font-medium text-gray-600">Client</th>
            <th className="pb-3 pr-4 font-medium text-gray-600">Canal</th>
            <th className="pb-3 pr-4 font-medium text-gray-600">Produits</th>
            <th className="pb-3 pr-4 font-medium text-gray-600">Livreur</th>
            {isAdmin && <th className="pb-3 pr-4 font-medium text-gray-600">Total</th>}
            <th className="pb-3 pr-4 font-medium text-gray-600">Date</th>
            <th className="pb-3 font-medium text-gray-600">Statut</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {orders.map((order) => {
            const total = orderTotal(order.order_lines ?? [])

            return (
              <tr
                key={order.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push(`/orders/${order.id}`)}
              >
                <td className="py-3 pr-4">
                  <p className="font-medium text-gray-900">{order.client_name}</p>
                  {order.client_phone && (
                    <p className="text-gray-400 text-xs">{order.client_phone}</p>
                  )}
                </td>
                <td className="py-3 pr-4 text-gray-600">{CHANNEL_LABELS[order.channel]}</td>
                <td className="py-3 pr-4">
                  {order.order_lines?.map((l) => (
                    <div key={l.id} className="text-gray-600">
                      {l.product?.name ?? 'Produit'}{l.pricing_type === 'offer' ? ` · ${l.offer_name} × ${l.offer_count}` : ` × ${l.quantity}`}
                    </div>
                  ))}
                </td>
                <td className="py-3 pr-4">
                  {order.delivery_driver ? (
                    <><p className="font-medium text-gray-700">{order.delivery_driver.name}</p>{order.delivery_driver.phone && <p className="text-xs text-gray-400">{order.delivery_driver.phone}</p>}</>
                  ) : <span className="text-gray-400">Non assigné</span>}
                </td>
                {isAdmin && (
                  <td className="py-3 pr-4 font-medium text-gray-900">
                    {formatCurrency(total + (order.delivery_fee ?? 0))}
                  </td>
                )}
                <td className="py-3 pr-4 text-gray-600">{formatDate(order.order_date)}</td>
                <td className="py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-col gap-1.5">
                    <OrderStatusBadge status={order.status} />
                    {updating === order.id ? (
                      <span className="text-xs text-gray-400 italic">Mise à jour...</span>
                    ) : (
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(e, order.id)}
                        className="text-xs font-medium border border-gray-300 rounded-lg px-2 py-1.5 bg-white text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
    </>
  )
}
