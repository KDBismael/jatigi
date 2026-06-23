'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { OrderForm } from '@/components/orders/order-form'
import { useOrders } from '@/hooks/use-orders'
import { useProducts } from '@/hooks/use-products'
import type { OrderInput } from '@/lib/schemas/order.schema'
import type { Product } from '@/types/product'
import { useDeliveryDrivers } from '@/hooks/use-delivery-drivers'

export default function NewOrderPage() {
  const router = useRouter()
  const { create } = useOrders()
  const { products } = useProducts()
  const { drivers } = useDeliveryDrivers()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(data: OrderInput) {
    setError(null)
    setIsLoading(true)
    try {
      await create(data)
      router.push('/orders')
    } catch (err) {
      setError(String(err))
      setIsLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nouvelle commande</h1>
        <p className="text-gray-500 text-sm mt-1">Créez une commande client</p>
      </div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}
      <OrderForm onSubmit={handleSubmit} products={products as Product[]} drivers={drivers} isLoading={isLoading} />
    </div>
  )
}
