'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { OrderStatusBadge } from '@/components/orders/order-status-badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate, resolveUnitCost } from '@/lib/utils'
import { CHANNELS, CHANNEL_LABELS, STATUSES, STATUS_LABELS, type OrderStatus } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth-store'
import type { Order } from '@/types/order'
import { useDeliveryDrivers } from '@/hooks/use-delivery-drivers'

const channelOptions = CHANNELS.map((c) => ({ value: c, label: CHANNEL_LABELS[c] }))

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const isAdmin = useAuthStore((s) => s.isAdmin())
  const { drivers } = useDeliveryDrivers()
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  // Edit state
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editChannel, setEditChannel] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editDriverId, setEditDriverId] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then(setOrder)
      .finally(() => setIsLoading(false))
  }, [id])

  function startEdit() {
    if (!order) return
    setEditName(order.client_name)
    setEditPhone(order.client_phone ?? '')
    setEditChannel(order.channel)
    setEditDate(order.order_date)
    setEditDriverId(order.delivery_driver_id ?? '')
    setSaveError(null)
    setIsEditing(true)
  }

  async function saveEdit() {
    setIsSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: editName,
          client_phone: editPhone || null,
          channel: editChannel,
          order_date: editDate,
          delivery_driver_id: editDriverId || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setSaveError(err.error ?? 'Erreur serveur')
        return
      }
      const updated = await res.json()
      setOrder(updated)
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

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
  const totalRevenue = lines.reduce((s, l) => s + (l.unit_price ?? 0) * l.quantity, 0)
  const totalCost = lines.reduce((s, l) => s + resolveUnitCost(l.unit_cost ?? 0, l.product) * l.quantity, 0)
  const totalProfit = totalRevenue - totalCost

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>←</Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{order.client_name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {CHANNEL_LABELS[order.channel]} · {formatDate(order.order_date)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} />
          {!isEditing && (
            <Button variant="secondary" size="sm" onClick={startEdit}>Modifier</Button>
          )}
        </div>
      </div>

      {/* Inline edit form */}
      {isEditing && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Modifier la commande</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nom du client"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
              <Input
                label="Téléphone (optionnel)"
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </div>
            <Select
              label="Livreur assigné"
              options={drivers.map((driver) => ({ value: driver.id, label: driver.name }))}
              placeholder="Aucun livreur"
              value={editDriverId}
              onChange={(event) => setEditDriverId(event.target.value)}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Canal"
                options={channelOptions}
                value={editChannel}
                onChange={(e) => setEditChannel(e.target.value)}
              />
              <Input
                label="Date de commande"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            <div className="flex gap-2">
              <Button onClick={saveEdit} disabled={isSaving}>
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
              <Button variant="secondary" onClick={() => setIsEditing(false)} disabled={isSaving}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><h2 className="font-semibold text-gray-900">Livraison</h2></CardHeader>
        <CardContent>
          {order.delivery_driver ? (
            <div><p className="font-medium text-gray-900">{order.delivery_driver.name}</p>{order.delivery_driver.phone && <p className="text-sm text-gray-500 mt-1">{order.delivery_driver.phone}</p>}</div>
          ) : <p className="text-sm text-gray-500">Aucun livreur assigné.</p>}
        </CardContent>
      </Card>

      {/* Status change */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Statut</h2>
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
                {isAdmin && (
                  <>
                    <th className="pb-2 pr-4 font-medium text-gray-500 text-right">Prix unit.</th>
                    <th className="pb-2 pr-4 font-medium text-gray-500 text-right">Coût unit.</th>
                    <th className="pb-2 pr-4 font-medium text-gray-500 text-right">Total</th>
                    <th className="pb-2 font-medium text-gray-500 text-right">Bénéfice</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lines.map((l) => {
                const effectiveCost = resolveUnitCost(l.unit_cost ?? 0, l.product)
                const lineRevenue = (l.unit_price ?? 0) * l.quantity
                const lineProfit = lineRevenue - effectiveCost * l.quantity
                return (
                  <tr key={l.id}>
                    <td className="py-2.5 pr-4 font-medium text-gray-900">
                      {l.product?.name ?? 'Produit'}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-600 text-right">{l.quantity}</td>
                    {isAdmin && (
                      <>
                        <td className="py-2.5 pr-4 text-gray-600 text-right">{formatCurrency(l.unit_price ?? 0)}</td>
                        <td className="py-2.5 pr-4 text-gray-500 text-right">{formatCurrency(effectiveCost)}</td>
                        <td className="py-2.5 pr-4 font-medium text-gray-900 text-right">{formatCurrency(lineRevenue)}</td>
                        <td className={`py-2.5 font-semibold text-right ${lineProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(lineProfit)}
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Financial summary — admin only */}
      {isAdmin && (
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
      )}

      {/* Client info */}
      {order.client_phone && !isEditing && (
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
