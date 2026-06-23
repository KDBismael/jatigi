'use client'

import { useEffect } from 'react'
import { useProductStore } from '@/stores/product-store'
import type { ProductInput } from '@/lib/schemas/product.schema'

export function useProducts() {
  const { products, isLoading, setProducts, addProduct, updateProduct, removeProduct, setLoading } =
    useProductStore()

  useEffect(() => {
    setLoading(true)
    fetch('/api/products')
      .then((r) => {
        if (!r.ok) throw new Error('Impossible de charger les produits')
        return r.json()
      })
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function create(input: ProductInput) {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error(await res.text())
    const product = await res.json()
    addProduct(product)
    return product
  }

  async function update(id: string, input: Partial<ProductInput>) {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error(await res.text())
    const product = await res.json()
    updateProduct(id, product)
    return product
  }

  async function remove(id: string) {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(await res.text())
    removeProduct(id)
  }

  return { products, isLoading, create, update, remove }
}
