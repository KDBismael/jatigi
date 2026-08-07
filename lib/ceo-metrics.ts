export interface MetricOrder { status: string; revenue: number; cost: number }

export function computeCeoMetrics(orders: MetricOrder[], expenseTotal: number) {
  const delivered = orders.filter((order) => order.status === 'delivered')
  const revenue = delivered.reduce((sum, order) => sum + order.revenue, 0)
  const costOfGoods = delivered.reduce((sum, order) => sum + order.cost, 0)
  return {
    revenue,
    cost_of_goods: costOfGoods,
    expense_total: expenseTotal,
    estimated_profit: revenue - costOfGoods - expenseTotal,
    total_orders: orders.length,
    delivered_orders: delivered.length,
    cancelled_orders: orders.filter((order) => order.status === 'cancelled').length,
    average_basket: delivered.length ? revenue / delivered.length : 0,
  }
}

export function progressPercent(value: number, target: number) {
  return target > 0 ? Math.min(100, Math.max(0, value / target * 100)) : 0
}
