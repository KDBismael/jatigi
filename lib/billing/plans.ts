import { TEST_BILLING_PRICES } from './test-pricing'
import {CONFIGURED_BILLING_PRICES,HAS_CUSTOM_BILLING_PRICES,annualDiscount} from './pricing'
export const PLAN_IDS = ['discovery', 'pro', 'business'] as const
export type PlanId = typeof PLAN_IDS[number]
export type BillingCycle = 'monthly' | 'yearly'
export const PLANS = {
  discovery: { id: 'discovery', name: 'Découverte', monthly: 0, yearly: 0, users: 1, drivers: 1, ordersPerMonth: 100, liveSessions: true, dailyBalance: false, historyDays: 0 },
  pro: { id: 'pro', name: 'Pro', launchCompareAt: { monthly: TEST_BILLING_PRICES || HAS_CUSTOM_BILLING_PRICES ? null : 7000, yearly: TEST_BILLING_PRICES || HAS_CUSTOM_BILLING_PRICES ? null : 60000 }, monthly: TEST_BILLING_PRICES?.pro ?? CONFIGURED_BILLING_PRICES.pro.monthly, yearly: TEST_BILLING_PRICES?.pro ?? CONFIGURED_BILLING_PRICES.pro.yearly, users: 3, drivers: 5, ordersPerMonth: null, liveSessions: true, dailyBalance: true, historyDays: 30 },
  business: { id: 'business', name: 'Business', launchCompareAt: { monthly: TEST_BILLING_PRICES || HAS_CUSTOM_BILLING_PRICES ? null : 15000, yearly: TEST_BILLING_PRICES || HAS_CUSTOM_BILLING_PRICES ? null : 120000 }, monthly: TEST_BILLING_PRICES?.business ?? CONFIGURED_BILLING_PRICES.business.monthly, yearly: TEST_BILLING_PRICES?.business ?? CONFIGURED_BILLING_PRICES.business.yearly, users: null, drivers: null, ordersPerMonth: null, liveSessions: true, dailyBalance: true, historyDays: null },
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

export const ANNUAL_SAVING_PERCENT=Math.min(annualDiscount(PLANS.pro.monthly,PLANS.pro.yearly),annualDiscount(PLANS.business.monthly,PLANS.business.yearly))
