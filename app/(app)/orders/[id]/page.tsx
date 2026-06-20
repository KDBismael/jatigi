'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { OrderStatusBadge } from '@/components/orders/order-status-badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CHANNEL_LABELS, STATUSES, STATUS_LABELS, type OrderStatus } from '@/lib/constants'
import type { Order } from '@/types/order'

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then(setOrder)
      .finally(() => setIsLoading(false))
  }, [id])

  async function handleStatusChange(status: OrderStatus) {
    if (!order) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        const updated = await res.json()
        setOrder((prev) => prev ? { ...prev, status: updated.status } : prev)
      }
    } finally {
      setUpdating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40" />
        <Skeleton className="h-60" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-16 text-gray-500">
        Commande introuvable.
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mt-4 block mx-auto">
          ← Retour
        </Button>
      </div>
    )
  }

  const lines = order.order_lines ?? []

  // Resolve the effective unit cost per line:
  // prefer the stored unit_cost (FIFO lot cost); fall back to current
  // product costs when the stored value is 0 (e.g. lot not yet set up).
  function resolveUnitCost(l: (typeof lines)[number]): number {
    if (l.unit_cost > 0) return l.unit_cost
    const p = l.product
    return (p?.purchase_cost ?? 0) + (p?.import_cost ?? 0) + (p?.packaging_cost ?? 0)
  }

  const totalRevenue = lines.reduce((s, l) => s + l.unit_price * l.quantity, 0)
  const totalCost = lines.reduce((s, l) => s + resolveUnitCost(l) * l.quantity, 0)
  const totalProfit = totalRevenue - totalCost

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          ←
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{order.client_name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {CHANNEL_LABELS[order.channel]} · {formatDate(order.order_date)}
          </p>
        </div>
        <div className="ml-auto">
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      {/* Status change */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Changer le statut</h2>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={order.status === s ? 'primary' : 'secondary'}
                disabled={updating || order.status === s}
                onClick={() => handleStatusChange(s)}
              >
                {STATUS_LABELS[s]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Order lines */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Produits commandés</h2>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="pb-2 pr-4 font-medium text-gray-500">Produit</th>
                <th className="pb-2 pr-4 font-medium text-gray-500 text-right">Qté</th>
                <th className="pb-2 pr-4 font-medium text-gray-500 text-right">Prix unit.</th>
                <th className="pb-2 pr-4 font-medium text-gray-500 text-right">Coût unit.</th>
                <th className="pb-2 pr-4 font-medium text-gray-500 text-right">Total</th>
                <th className="pb-2 font-medium text-gray-500 text-right">Bénéfice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lines.map((l) => {
                const effectiveCost = resolveUnitCost(l)
                const lineRevenue = l.unit_price * l.quantity
                const lineCost = effectiveCost * l.quantity
                const lineProfit = lineRevenue - lineCost
                return (
                  <tr key={l.id}>
                    <td className="py-2.5 pr-4 font-medium text-gray-900">
                      {l.product?.name ?? 'Produit'}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-600 text-right">{l.quantity}</td>
                    <td className="py-2.5 pr-4 text-gray-600 text-right">{formatCurrency(l.unit_price)}</td>
                    <td className="py-2.5 pr-4 text-gray-500 text-right">{formatCurrency(effectiveCost)}</td>
                    <td className="py-2.5 pr-4 font-medium text-gray-900 text-right">{formatCurrency(lineRevenue)}</td>
                    <td className={`py-2.5 font-semibold text-right ${lineProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(lineProfit)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500 font-medium">Chiffre d&apos;affaires</p>
            <p className="text-xl font-bold text-indigo-600 mt-1">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500 font-medium">Coût total</p>
            <p className="text-xl font-bold text-gray-700 mt-1">{formatCurrency(totalCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500 font-medium">Bénéfice net</p>
            <p className={`text-xl font-bold mt-1 ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalProfit)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Client info */}
      {order.client_phone && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Contact client</h2>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">{order.client_phone}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
