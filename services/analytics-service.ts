import { createAdminClient } from '@/services/supabase/server'
import type { DashboardStats, ProductPerformance, ChannelStat, RevenueByPeriod } from '@/types/analytics'
import type { DateRange } from '@/lib/date-periods'
import { resolveUnitCost } from '@/lib/utils'
import type { CeoMetrics, SellerPerformance, LivePerformance, SlotPerformance, MonthlyGoal, LiveSlot } from '@/types/pilotage'
import { computeCeoMetrics, progressPercent } from '@/lib/ceo-metrics'

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

  return Array.from(map.values()).sort((a, b) => b.total_quantity - a.total_quantity || b.total_revenue - a.total_revenue || a.product_name.localeCompare(b.product_name))
    .map((item, index) => ({ ...item, rank: index + 1 }))
}

type PilotOrder = {
  id: string; status: string; order_date: string; delivered_at: string | null; seller_id: string; live_session_id: string | null
  seller: { full_name: string } | null; live_session: { name: string | null; slot: LiveSlot; session_date: string; target_amount: number } | null
  order_lines: LineCosts[]
}

function summarize(orders: PilotOrder[], expenseTotal: number): CeoMetrics {
  return computeCeoMetrics(orders.map(o => ({ status:o.status,
    revenue:o.order_lines.reduce((s,l)=>s+Number(l.unit_price)*l.quantity,0),
    cost:o.order_lines.reduce((s,l)=>s+resolveUnitCost(Number(l.unit_cost),l.product)*l.quantity,0) })), expenseTotal)
}

export async function getCeoDashboard(organizationId: string, today: string, monthStart: string, monthEnd: string) {
  const supabase = await createAdminClient()
  const [ordersResult, expenseResult, goalsResult] = await Promise.all([
    supabase.from('orders').select('id,status,order_date,delivered_at,seller_id,live_session_id,seller:sales_people!orders_seller_id_fkey(full_name),live_session:live_sessions(name,slot,session_date,target_amount),order_lines(unit_price,unit_cost,quantity,product:products(purchase_cost,import_cost,packaging_cost))')
      .eq('organization_id', organizationId).or(`and(delivered_at.gte.${monthStart}T00:00:00Z,delivered_at.lt.${monthEnd}T00:00:00Z),and(order_date.gte.${monthStart},order_date.lt.${monthEnd})`),
    supabase.from('expenses').select('amount,expense_date,category').eq('organization_id', organizationId).gte('expense_date', monthStart).lt('expense_date', monthEnd),
    supabase.from('monthly_goals').select('*').eq('organization_id', organizationId).eq('month', monthStart),
  ])
  if (ordersResult.error) throw new Error(ordersResult.error.message)
  const orders = (ordersResult.data ?? []) as unknown as PilotOrder[]
  const expenses = expenseResult.data ?? []
  const monthExpenses = expenses.filter(e => e.category !== 'stock').reduce((s, e) => s + Number(e.amount), 0)
  const todayExpenses = expenses.filter(e => e.expense_date === today && e.category !== 'stock').reduce((s, e) => s + Number(e.amount), 0)
  const todayOrders = orders.filter(o => o.delivered_at?.slice(0, 10) === today || (o.status !== 'delivered' && o.order_date === today))
  const goals = (goalsResult.data ?? []) as MonthlyGoal[]
  const sellerTargets = new Map(goals.filter(g => g.scope === 'seller').map(g => [g.seller_id, Number(g.amount)]))
  const liveTargets = new Map(goals.filter(g => g.scope === 'live').map(g => [g.live_session_id, Number(g.amount)]))

  const sellers = new Map<string, SellerPerformance>()
  const lives = new Map<string, LivePerformance>()
  for (const order of orders.filter(o => o.status === 'delivered')) {
    const value = order.order_lines.reduce((s, l) => s + Number(l.unit_price) * l.quantity, 0)
    const seller = sellers.get(order.seller_id) ?? { seller_id: order.seller_id, seller_name: order.seller?.full_name ?? 'Inconnu', order_count: 0, revenue: 0, average_basket: 0, target: sellerTargets.get(order.seller_id) ?? 0, progress: 0, rank: 0 }
    seller.order_count++; seller.revenue += value; sellers.set(order.seller_id, seller)
    if (order.live_session_id && order.live_session) {
      const live = lives.get(order.live_session_id) ?? { live_session_id: order.live_session_id, name: order.live_session.name ?? 'Live', slot: order.live_session.slot, session_date: order.live_session.session_date, order_count: 0, revenue: 0, average_basket: 0, target: liveTargets.get(order.live_session_id) ?? Number(order.live_session.target_amount), progress: 0 }
      live.order_count++; live.revenue += value; lives.set(order.live_session_id, live)
    }
  }
  const sellerPerformance = [...sellers.values()].sort((a,b) => b.revenue-a.revenue || b.order_count-a.order_count || a.seller_name.localeCompare(b.seller_name)).map((s,i) => ({ ...s, rank:i+1, average_basket:s.revenue/s.order_count, progress:progressPercent(s.revenue,s.target) }))
  const livePerformance = [...lives.values()].sort((a,b) => b.revenue-a.revenue).map(l => ({ ...l, average_basket:l.revenue/l.order_count, progress:progressPercent(l.revenue,l.target) }))
  const slots: LiveSlot[] = ['morning','afternoon','evening']
  const rawSlots = slots.map(slot => { const rows=livePerformance.filter(l=>l.slot===slot); const revenue=rows.reduce((s,l)=>s+l.revenue,0); const count=rows.reduce((s,l)=>s+l.order_count,0); return {slot,order_count:count,revenue,average_basket:count?revenue/count:0,is_best:false} })
  const best = Math.max(...rawSlots.map(s => s.revenue))
  const slotPerformance: SlotPerformance[] = rawSlots.map(s => ({...s,is_best:s.revenue>0&&s.revenue===best}))
  return { today: summarize(todayOrders, todayExpenses), month: summarize(orders, monthExpenses), goals, sellerPerformance, livePerformance, slotPerformance }
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
