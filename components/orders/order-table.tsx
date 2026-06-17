'use client'

import { useState } from 'react'
import type { Order } from '@/types/order'
import type { OrderStatus } from '@/lib/constants'
import { STATUSES, STATUS_LABELS, CHANNEL_LABELS } from '@/lib/constants'
import { OrderStatusBadge } from './order-status-badge'
import { formatDate, formatCurrency } from '@/lib/utils'

interface OrderTableProps {
  orders: Order[]
  onStatusChange: (id: string, status: OrderStatus) => Promise<void>
}

export function OrderTable({ orders, onStatusChange }: OrderTableProps) {
  const [updating, setUpdating] = useState<string | null>(null)

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        Aucune commande trouvée.
      </div>
    )
  }

  async function handleStatusChange(id: string, status: string) {
    setUpdating(id)
    try {
      await onStatusChange(id, status as OrderStatus)
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="pb-3 pr-4 font-medium text-gray-600">Client</th>
            <th className="pb-3 pr-4 font-medium text-gray-600">Canal</th>
            <th className="pb-3 pr-4 font-medium text-gray-600">Produits</th>
            <th className="pb-3 pr-4 font-medium text-gray-600">Total</th>
            <th className="pb-3 pr-4 font-medium text-gray-600">Date</th>
            <th className="pb-3 font-medium text-gray-600">Statut</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {orders.map((order) => {
            const total = order.order_lines?.reduce(
              (sum, l) => sum + l.unit_price * l.quantity,
              0
            ) ?? 0

            return (
              <tr key={order.id} className="hover:bg-gray-50">
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
                      {l.product?.name ?? 'Produit'} × {l.quantity}
                    </div>
                  ))}
                </td>
                <td className="py-3 pr-4 font-medium text-gray-900">
                  {formatCurrency(total)}
                </td>
                <td className="py-3 pr-4 text-gray-600">{formatDate(order.order_date)}</td>
                <td className="py-3">
                  {updating === order.id ? (
                    <span className="text-xs text-gray-400">...</span>
                  ) : (
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
