/** Invalidate the shared billing summary after a successful quota-changing write. */
export const BILLING_USAGE_CHANGED = 'warko:billing-usage-changed'
export function notifyBillingUsageChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(BILLING_USAGE_CHANGED))
}
