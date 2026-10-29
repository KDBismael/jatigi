'use client'

import { useSubscription } from '@/hooks/use-subscription'
import { BillingUsageBanner } from '@/components/billing/billing-usage-banner'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { OrderForm } from '@/components/orders/order-form'
import { useOrders } from '@/hooks/use-orders'
import { useProducts } from '@/hooks/use-products'
import type { OrderInput } from '@/lib/schemas/order.schema'
import type { Product } from '@/types/product'
import { useDeliveryDrivers } from '@/hooks/use-delivery-drivers'
import { useAuthStore } from '@/stores/auth-store'
import { useOrderOptions } from '@/hooks/use-order-options'

export default function NewOrderPage() {
  const { summary } = useSubscription()
  const isManager = useAuthStore(s=>s.profile?.role==='manager')
  const router = useRouter()
  const { create } = useOrders()
  const { products } = useProducts()
  const { drivers } = useDeliveryDrivers()
  const { sellers, lives } = useOrderOptions()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const saving = useRef(false)

  async function handleSubmit(data: OrderInput, print = false) {
    if (saving.current) return
    saving.current = true
    setError(null)
    setIsLoading(true)
    try {
      const order = await create(data)
      router.push(print ? `/orders/${order.id}/print?print=1` : '/orders')
    } catch (err) {
      setError(String(err))
      setIsLoading(false)
      saving.current = false
    }
  }

  if(isManager)return <p>Accès réservé aux livraisons.</p>
  return (
    <div>
      <BillingUsageBanner summary={summary} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nouvelle commande</h1>
        <p className="text-gray-500 text-sm mt-1">Créez une commande client</p>
      </div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}
      <OrderForm onSubmit={data => handleSubmit(data)} onSaveAndPrint={data => handleSubmit(data, true)} products={products as Product[]} drivers={drivers} sellers={sellers} lives={lives} isLoading={isLoading} />
    </div>
  )
}
