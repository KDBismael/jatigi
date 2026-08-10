export type LiveSlot = 'morning' | 'afternoon' | 'evening'
export type ExpenseCategory = 'salary' | 'rent' | 'stock' | 'packaging' | 'internet' | 'electricity' | 'other'

export interface LiveSession {
  id: string; organization_id: string; name: string | null; session_date: string
  slot: LiveSlot; target_amount: number; status: 'planned' | 'completed' | 'cancelled'; created_at: string
}

export interface Expense {
  id: string; organization_id: string; category: ExpenseCategory; label: string; amount: number
  expense_date: string; receipt_url: string | null; recurrence_id: string | null; sales_person_id: string | null; created_at: string
  sales_person?: { id: string; full_name: string } | null
}

export interface MonthlyGoal {
  id: string; month: string; scope: 'global' | 'seller' | 'live'; amount: number
  seller_id: string | null; live_session_id: string | null
}

export interface SellerPerformance {
  seller_id: string; seller_name: string; order_count: number; revenue: number
  average_basket: number; target: number; progress: number; rank: number
}

export interface LivePerformance {
  live_session_id: string; name: string; slot: LiveSlot; session_date: string
  order_count: number; revenue: number; average_basket: number; target: number; progress: number
}

export interface SlotPerformance {
  slot: LiveSlot; order_count: number; revenue: number; average_basket: number; is_best: boolean
}

export interface CeoMetrics {
  revenue: number; cost_of_goods: number; expense_total: number; estimated_profit: number
  total_orders: number; delivered_orders: number; cancelled_orders: number; average_basket: number
}

export interface MonthlyReport {
  id: string; organization_id: string; month: string; snapshot: Record<string, number | Array<Record<string, string | number>>>
  generated_at: string; regenerated_at: string | null
}

export interface PeriodicReport {
  id?: string; organization_id?: string; period_type: import('@/lib/report-periods').ReportPeriod
  period_start: string; period_end: string
  snapshot: Record<string, number | Array<Record<string, string | number>>>
  generated_at?: string; regenerated_at?: string | null; is_closed: boolean; is_current?: boolean; label?: string
}
