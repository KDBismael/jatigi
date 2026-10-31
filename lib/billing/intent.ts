import type { BillingCycle, PlanId } from './plans'
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>
export type BillingIntent = { userId: string; plan: PlanId; cycle: BillingCycle }
const KEY = 'warko.billing-intent'
export function saveBillingIntent(storage: Storage, userId: string, plan?: PlanId, cycle?: BillingCycle) {
 try {
  storage.removeItem(KEY)
  if (plan && userId) storage.setItem(KEY, JSON.stringify({ userId, plan, cycle: cycle ?? 'monthly' }))
 } catch { /* The choice must never block authentication if browser storage is disabled. */ }
}
export function readBillingIntent(storage: Storage, userId: string): BillingIntent | null {
 try {
  const value = JSON.parse(storage.getItem(KEY) ?? 'null')
  if (!value || value.userId !== userId || !['discovery','pro','business'].includes(value.plan) || !['monthly','yearly'].includes(value.cycle)) return null
  return { userId, plan: value.plan, cycle: value.cycle }
 } catch { return null }
}
