import { createClient } from '@/services/supabase/server'
import type { DashboardStats, ProductPerformance, ChannelStat, RevenueByPeriod } from '@/types/analytics'

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('orders')
    .select('status, order_lines(unit_price, unit_cost, quantity)')

  if (!orders) return { total_revenue: 0, net_profit: 0, total_orders: 0, delivered_orders: 0, cancelled_orders: 0, in_progress_orders: 0 }

  let total_revenue = 0
  let net_profit = 0
  let delivered_orders = 0
  let cancelled_orders = 0
  let in_progress_orders = 0

  for (const order of orders) {
    const lines = (order.order_lines as { unit_price: number; unit_cost: number; quantity: number }[]) ?? []
    const orderRevenue = lines.reduce((s, l) => s + l.unit_price * l.quantity, 0)
    const orderCost = lines.reduce((s, l) => s + l.unit_cost * l.quantity, 0)

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

export async function getProductPerformance(): Promise<ProductPerformance[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('order_lines')
    .select('product_id, quantity, unit_price, unit_cost, product:products(name), order:orders(status)')

  if (!data) return []

  const map = new Map<string, ProductPerformance>()

  for (const line of data) {
    const order = (line.order as unknown) as { status: string } | null
    if (order?.status !== 'delivered') continue

    const id = line.product_id
    const name = ((line.product as unknown) as { name: string } | null)?.name ?? 'Inconnu'
    const revenue = line.unit_price * line.quantity
    const profit = (line.unit_price - line.unit_cost) * line.quantity

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

export async function getChannelStats(): Promise<ChannelStat[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('orders')
    .select('channel, order_lines(unit_price, quantity)')

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

export async function getRevenueByPeriod(days = 30): Promise<RevenueByPeriod[]> {
  const supabase = await createClient()
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data } = await supabase
    .from('orders')
    .select('order_date, status, order_lines(unit_price, unit_cost, quantity)')
    .gte('order_date', since.toISOString().split('T')[0])
    .order('order_date')

  if (!data) return []

  const map = new Map<string, RevenueByPeriod>()

  for (const order of data) {
    if (order.status !== 'delivered') continue
    const lines = (order.order_lines as { unit_price: number; unit_cost: number; quantity: number }[]) ?? []
    const revenue = lines.reduce((s, l) => s + l.unit_price * l.quantity, 0)
    const profit = lines.reduce((s, l) => s + (l.unit_price - l.unit_cost) * l.quantity, 0)

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
