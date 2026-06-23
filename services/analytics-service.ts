import { createAdminClient } from '@/services/supabase/server'
import type { DashboardStats, ProductPerformance, ChannelStat, RevenueByPeriod } from '@/types/analytics'
import type { DateRange } from '@/lib/date-periods'
import { resolveUnitCost } from '@/lib/utils'

type LineCosts = { unit_price: number; unit_cost: number; quantity: number; product?: { purchase_cost?: number; import_cost?: number; packaging_cost?: number } | null }

export async function getDashboardStats(range: DateRange, organizationId: string): Promise<DashboardStats> {
  const supabase = await createAdminClient()

  const { data: orders } = await supabase
    .from('orders')
    .select('status, order_lines(unit_price, unit_cost, quantity, product:products(purchase_cost, import_cost, packaging_cost))')
    .eq('organization_id', organizationId)
    .gte('order_date', range.dateFrom)
    .lte('order_date', range.dateTo)

  if (!orders) return { total_revenue: 0, net_profit: 0, total_orders: 0, delivered_orders: 0, cancelled_orders: 0, in_progress_orders: 0 }

  let total_revenue = 0
  let net_profit = 0
  let delivered_orders = 0
  let cancelled_orders = 0
  let in_progress_orders = 0

  for (const order of orders) {
    const lines = (order.order_lines as unknown as LineCosts[]) ?? []
    const orderRevenue = lines.reduce((s, l) => s + l.unit_price * l.quantity, 0)
    const orderCost = lines.reduce((s, l) => s + resolveUnitCost(l.unit_cost, l.product) * l.quantity, 0)

    if (order.status === 'delivered') {
      total_revenue += orderRevenue
      net_profit += orderRevenue - orderCost
      delivered_orders++
    } else if (order.status === 'cancelled') {
      cancelled_orders++
    } else if (order.status === 'in_progress') {
      in_progress_orders++
    }
  }

  return {
    total_revenue,
    net_profit,
    total_orders: orders.length,
    delivered_orders,
    cancelled_orders,
    in_progress_orders,
  }
}

export async function getProductPerformance(range: DateRange, organizationId: string): Promise<ProductPerformance[]> {
  const supabase = await createAdminClient()

  const { data: deliveredOrders } = await supabase
    .from('orders')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('status', 'delivered')
    .gte('order_date', range.dateFrom)
    .lte('order_date', range.dateTo)

  const ids = deliveredOrders?.map((o) => o.id) ?? []
  if (ids.length === 0) return []

  const { data } = await supabase
    .from('order_lines')
    .select('product_id, quantity, unit_price, unit_cost, product:products(name, purchase_cost, import_cost, packaging_cost)')
    .in('order_id', ids)

  if (!data) return []

  const map = new Map<string, ProductPerformance>()

  for (const line of data as unknown as (LineCosts & { product_id: string })[]) {
    const id = line.product_id
    const name = (line.product as unknown as { name?: string } | null)?.name ?? 'Inconnu'
    const effectiveCost = resolveUnitCost(line.unit_cost, line.product)
    const revenue = line.unit_price * line.quantity
    const profit = (line.unit_price - effectiveCost) * line.quantity

    const existing = map.get(id)
    if (existing) {
      existing.total_quantity += line.quantity
      existing.total_revenue += revenue
      existing.total_profit += profit
    } else {
      map.set(id, { product_id: id, product_name: name, total_quantity: line.quantity, total_revenue: revenue, total_profit: profit })
    }
  }

  return Array.from(map.values()).sort((a, b) => b.total_quantity - a.total_quantity)
}

export async function getChannelStats(range: DateRange, organizationId: string): Promise<ChannelStat[]> {
  const supabase = await createAdminClient()

  const { data } = await supabase
    .from('orders')
    .select('channel, order_lines(unit_price, quantity)')
    .eq('organization_id', organizationId)
    .eq('status', 'delivered')
    .gte('order_date', range.dateFrom)
    .lte('order_date', range.dateTo)

  if (!data) return []

  const map = new Map<string, ChannelStat>()

  for (const order of data) {
    const lines = (order.order_lines as { unit_price: number; quantity: number }[]) ?? []
    const revenue = lines.reduce((s, l) => s + l.unit_price * l.quantity, 0)

    const existing = map.get(order.channel)
    if (existing) {
      existing.order_count++
      existing.revenue += revenue
    } else {
      map.set(order.channel, { channel: order.channel, order_count: 1, revenue })
    }
  }

  return Array.from(map.values())
}

export async function getRevenueByPeriod(range: DateRange, organizationId: string): Promise<RevenueByPeriod[]> {
  const supabase = await createAdminClient()

  const { data } = await supabase
    .from('orders')
    .select('order_date, status, order_lines(unit_price, unit_cost, quantity, product:products(purchase_cost, import_cost, packaging_cost))')
    .eq('organization_id', organizationId)
    .gte('order_date', range.dateFrom)
    .lte('order_date', range.dateTo)
    .order('order_date')

  if (!data) return []

  const map = new Map<string, RevenueByPeriod>()

  for (const order of data) {
    if (order.status !== 'delivered') continue
    const lines = (order.order_lines as unknown as LineCosts[]) ?? []
    const revenue = lines.reduce((s, l) => s + l.unit_price * l.quantity, 0)
    const profit = lines.reduce((s, l) => s + (l.unit_price - resolveUnitCost(l.unit_cost, l.product)) * l.quantity, 0)

    const existing = map.get(order.order_date)
    if (existing) {
      existing.revenue += revenue
      existing.profit += profit
    } else {
      map.set(order.order_date, { date: order.order_date, revenue, profit })
    }
  }

  return Array.from(map.values())
}
