'use client'

import { create } from 'zustand'
import type { Product } from '@/types/product'

interface ProductState {
  products: Product[]
  isLoading: boolean
  setProducts: (products: Product[]) => void
  addProduct: (product: Product) => void
  updateProduct: (id: string, updates: Partial<Product>) => void
  removeProduct: (id: string) => void
  setLoading: (loading: boolean) => void
}

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  isLoading: false,
  setProducts: (products) => set({ products }),
  addProduct: (product) => set((s) => ({ products: [product, ...s.products] })),
  updateProduct: (id, updates) =>
    set((s) => ({
      products: s.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),
  removeProduct: (id) =>
    set((s) => ({ products: s.products.filter((p) => p.id !== id) })),
  setLoading: (isLoading) => set({ isLoading }),
}))
