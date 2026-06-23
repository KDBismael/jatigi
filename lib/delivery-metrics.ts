import type { OrderStatus } from '@/lib/constants'

export interface DeliveryMetricOrder {
  status: OrderStatus
  amount: number
}

export function calculateDeliveryMetrics(orders: DeliveryMetricOrder[], amountRemitted: number) {
  const delivered = orders.filter((order) => order.status === 'delivered')
  const cancelled = orders.filter((order) => order.status === 'cancelled')
  const completed = delivered.length + cancelled.length
  const amountCollected = delivered.reduce((sum, order) => sum + order.amount, 0)

  return {
    packages_assigned: orders.length,
    packages_in_progress: orders.filter((order) => order.status === 'received' || order.status === 'in_progress').length,
    packages_delivered: delivered.length,
    packages_cancelled: cancelled.length,
    success_rate: completed === 0 ? 0 : Math.round((delivered.length / completed) * 100),
    amount_collected: amountCollected,
    amount_remitted: amountRemitted,
    amount_due: Math.max(0, amountCollected - amountRemitted),
  }
}
