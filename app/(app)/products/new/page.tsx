'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProductForm } from '@/components/products/product-form'
import { useProducts } from '@/hooks/use-products'
import type { ProductInput } from '@/lib/schemas/product.schema'

export default function NewProductPage() {
  const router = useRouter()
  const { create } = useProducts()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(data: ProductInput) {
    setError(null)
    setIsLoading(true)
    try {
      await create(data)
      router.push('/products')
    } catch (err) {
      setError(String(err))
      setIsLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nouveau produit</h1>
        <p className="text-gray-500 text-sm mt-1">Ajoutez un produit à votre catalogue</p>
      </div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}
      <ProductForm onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  )
}
