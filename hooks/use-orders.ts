'use client'

import { useEffect } from 'react'
import { useOrderStore } from '@/stores/order-store'
import type { OrderInput } from '@/lib/schemas/order.schema'
import type { OrderStatus } from '@/lib/constants'

export function useOrders() {
  const { orders, filters, isLoading, setOrders, addOrder, setFilters, updateOrderStatus, setLoading } =
    useOrderStore()

  useEffect(() => {
    setLoading(true)
    fetch('/api/orders')
      .then((r) => {
        if (!r.ok) throw new Error('Impossible de charger les commandes')
        return r.json()
      })
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredOrders = orders.filter((o) => {
    if (filters.status && o.status !== filters.status) return false
    if (filters.dateFrom && o.order_date < filters.dateFrom) return false
    if (filters.dateTo && o.order_date > filters.dateTo) return false
    if (filters.search && !o.client_name.toLowerCase().includes(filters.search.toLowerCase()))
      return false
    if (filters.deliverySearch && !o.delivery_driver?.name.toLowerCase().includes(filters.deliverySearch.toLowerCase()))
      return false
    return true
  })

  async function create(input: OrderInput) {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error(await res.text())
    const order = await res.json()
    addOrder(order)
    return order
  }

  async function updateStatus(id: string, status: OrderStatus) {
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) throw new Error(await res.text())
    updateOrderStatus(id, status)
  }

  return { orders: filteredOrders, allOrders: orders, filters, isLoading, create, updateStatus, setFilters }
}
