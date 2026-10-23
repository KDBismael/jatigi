import { resolveUnitCost } from '@/lib/utils'
import { orderCollectibleAmount, orderRemittableAmount } from '@/lib/order-amounts'
import { STATUSES, type OrderStatus } from '@/lib/constants'

// Pure, cross-org aggregation reducers for the platform (super-admin) dashboard.
// Kept free of Supabase so they can be unit-tested in isolation.

interface UserRow {
  id: string
  role: string
}

export function summarizeUsers(profiles: UserRow[], ownerIds: string[]) {
  const owners = new Set(ownerIds)
  return {
    users_count: profiles.length,
    admins: profiles.filter((p) => p.role === 'admin').length,
    employees: profiles.filter((p) => p.role === 'employee').length,
    owners: profiles.filter((p) => owners.has(p.id)).length,
  }
}

export function summarizeOrders(orders: { status: string }[]) {
  const by_status = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>
  for (const order of orders) {
    if (order.status in by_status) by_status[order.status as OrderStatus]++
  }
  return { total: orders.length, by_status }
}

interface DeliveryOrder {
  status: string
  confirmation_amount?: number
  delivery_fee?: number
  order_lines?: { line_total?: number; unit_price?: number | null; quantity: number }[]
}

export function summarizeDeliveries(orders: DeliveryOrder[], settlements: { amount: number }[]) {
  const collected = orders
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + orderCollectibleAmount(o.order_lines ?? [], Number(o.confirmation_amount ?? 0), Number(o.delivery_fee ?? 0)), 0)
  // Drivers keep delivery fees: only parcels minus deposits are owed to the shop.
  const remittable = orders
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + orderRemittableAmount(o.order_lines ?? [], Number(o.confirmation_amount ?? 0)), 0)
  const remitted = settlements.reduce((sum, s) => sum + Number(s.amount), 0)
  return { collected, remitted, due: Math.max(0, remittable - remitted) }
}

interface RevenueLine {
  line_total?: number
  total_cost?: number
  unit_price?: number | null
  unit_cost: number
  quantity: number
  product?: { purchase_cost?: number; import_cost?: number; packaging_cost?: number } | null
}

export function revenueProfitFromDelivered(orders: { status: string; order_lines?: RevenueLine[] }[]) {
  let revenue = 0
  let profit = 0
  for (const order of orders) {
    if (order.status !== 'delivered') continue
    const lines = order.order_lines ?? []
    revenue += lines.reduce((s, l) => s + (l.line_total == null ? Number(l.unit_price ?? 0) * l.quantity : Number(l.line_total)), 0)
    profit += lines.reduce((s, l) => {
      const lineRevenue = l.line_total == null ? Number(l.unit_price ?? 0) * l.quantity : Number(l.line_total)
      const lineCost = l.total_cost == null ? resolveUnitCost(l.unit_cost, l.product) * l.quantity : Number(l.total_cost)
      return s + lineRevenue - lineCost
    }, 0)
  }
  return { revenue, profit }
}
