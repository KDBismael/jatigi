'use client'

import { create } from 'zustand'
import type { Order } from '@/types/order'
import type { OrderStatus } from '@/lib/constants'

interface OrderFilter {
  status?: OrderStatus | ''
  dateFrom?: string
  dateTo?: string
  search?: string
  deliverySearch?: string
}

interface OrderState {
  orders: Order[]
  filters: OrderFilter
  isLoading: boolean
  setOrders: (orders: Order[]) => void
  addOrder: (order: Order) => void
  setFilters: (filters: Partial<OrderFilter>) => void
  updateOrderStatus: (id: string, status: OrderStatus) => void
  setLoading: (loading: boolean) => void
}

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  filters: {},
  isLoading: false,
  setOrders: (orders) => set({ orders }),
  addOrder: (order) => set((s) => ({ orders: [order, ...s.orders] })),
  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),
  updateOrderStatus: (id, status) =>
    set((s) => ({
      orders: s.orders.map((o) => (o.id === id ? { ...o, status } : o)),
    })),
  setLoading: (isLoading) => set({ isLoading }),
}))
