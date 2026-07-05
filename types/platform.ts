import type { OrderStatus, Role } from '@/lib/constants'
import type { RevenueByPeriod } from '@/types/analytics'

export interface PlatformOverview {
  organizations_count: number
  users_count: number
  admins: number
  employees: number
  owners: number
  orders_total: number
  orders_by_status: Record<OrderStatus, number>
  total_revenue: number
  net_profit: number
  delivery_collected: number
  delivery_remitted: number
  delivery_due: number
  active_drivers: number
  revenue_series: RevenueByPeriod[]
}

export interface PlatformUser {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  role: Role
  organization_id: string | null
  organization_name: string | null
  is_owner: boolean
  created_at: string
}

export interface PlatformOrganization {
  id: string
  name: string
  owner_name: string | null
  users_count: number
  orders_count: number
  revenue: number
  delivery_collected: number
  created_at: string
}
