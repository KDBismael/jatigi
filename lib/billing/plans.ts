export const PLAN_IDS = ['discovery', 'pro', 'business'] as const
export type PlanId = typeof PLAN_IDS[number]
export type BillingCycle = 'monthly' | 'yearly'
export const PLANS = {
  discovery: { id: 'discovery', name: 'Découverte', monthly: 0, yearly: 0, users: 1, drivers: 1, ordersPerMonth: 100, liveSessions: true, dailyBalance: false, historyDays: 0 },
  pro: { id: 'pro', name: 'Pro', launchCompareAt: { monthly: 7000, yearly: 60000 }, monthly: 5000, yearly: 48000, users: 3, drivers: 5, ordersPerMonth: null, liveSessions: true, dailyBalance: true, historyDays: 30 },
  business: { id: 'business', name: 'Business', launchCompareAt: { monthly: 15000, yearly: 120000 }, monthly: 10000, yearly: 96000, users: null, drivers: null, ordersPerMonth: null, liveSessions: true, dailyBalance: true, historyDays: null },
} as const
export interface SubscriptionSummary {
  plan: PlanId
  cycle: BillingCycle | null
  status: 'free' | 'active' | 'grace' | 'expired'
  periodEnd: string | null
  cancelAtPeriodEnd: boolean
  pendingPlan: PlanId | null
  usage: { orders: number; drivers: number; users: number }
  limits: { orders: number | null; drivers: number | null; users: number | null }
  canManageBilling: boolean
  payments: { id: string; plan: PlanId; cycle: BillingCycle; amount: number; state: string; createdAt: string; paidAt: string | null; receiptUrl: string }[]
}
