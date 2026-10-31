'use client'

import { useEffect, useRef, useState } from 'react'
import { useProductStore } from '@/stores/product-store'
import type { ProductInput } from '@/lib/schemas/product.schema'
import type { Product } from '@/types/product'
import { ProductCreationAcknowledgedError } from '@/lib/product-errors'

async function mutationError(res: Response) {
  const body = await res.json().catch(() => null)
  const message = typeof body?.error === 'string' ? body.error.replace(/^Error:\s*/, '') : null
  return new Error(message && !/[{}]/.test(message) && !/schema|relationship|column|relation/i.test(message)
    ? message : 'Impossible d’enregistrer la modification. Réessayez plus tard.')
}

export function useProducts() {
  const { products, isLoading, setProducts, addProduct, updateProduct, removeProduct, setLoading } =
    useProductStore()
  const [error, setError] = useState<string | null>(null)
  const acknowledged = useRef<ProductCreationAcknowledgedError | null>(null)

  async function refresh() {
    setLoading(true)
    try {
      const response = await fetch('/api/products')
      if (!response.ok) throw new Error('read failed')
      const loaded = await response.json() as Product[]
      setProducts(loaded)
      setError(null)
      if (acknowledged.current && loaded.some(p => p.id === acknowledged.current?.productId)) acknowledged.current = null
    } catch {
      setError('Impossible de charger les produits. Réessayez.')
    } finally { setLoading(false) }
  }

  useEffect(() => {
    let active = true
    queueMicrotask(() => { if (active) void refresh() })
    return () => { active = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function create(input: ProductInput) {
    if (acknowledged.current) throw acknowledged.current
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw await mutationError(res)
    const product = await res.json()
    if (res.status === 202 && product.created === true && typeof product.id === 'string') {
      acknowledged.current = new ProductCreationAcknowledgedError(product.id)
      throw acknowledged.current
    }
    addProduct(product)
    return product
  }

  async function update(id: string, input: Partial<ProductInput> & { is_active?: boolean }) {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw await mutationError(res)
    const product = await res.json()
    updateProduct(id, product)
    return product
  }

  async function remove(id: string) {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
    if (!res.ok) throw await mutationError(res)
    const result = await res.json() as { deleted: boolean; product?: Product; message: string }
    if (result.deleted) removeProduct(id)
    else if (result.product) updateProduct(id, result.product)
    return result
  }

  return { products, isLoading, error, refresh, create, update, remove }
}
