import { Channel } from '@/lib/constants'

export interface DashboardStats {
  total_revenue: number
  net_profit: number
  total_orders: number
  delivered_orders: number
  cancelled_orders: number
  in_progress_orders: number
}

export interface ProductPerformance {
  product_id: string
  product_name: string
  total_quantity: number
  total_revenue: number
  total_profit: number
}

export interface ChannelStat {
  channel: Channel
  order_count: number
  revenue: number
}

export interface RevenueByPeriod {
  date: string
  revenue: number
  profit: number
}
