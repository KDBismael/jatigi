import { z } from 'zod'

export const SHOP_COUNTRIES = [
  { value: 'CI', label: 'Côte d’Ivoire' }, { value: 'SN', label: 'Sénégal' },
  { value: 'BF', label: 'Burkina Faso' }, { value: 'ML', label: 'Mali' },
  { value: 'TG', label: 'Togo' }, { value: 'BJ', label: 'Bénin' },
] as const

export const shopSettingsSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis').max(120),
  country: z.enum(['CI', 'SN', 'BF', 'ML', 'TG', 'BJ']),
  currency: z.literal('XOF'),
  default_delivery_fee: z.number().finite().min(0).max(100000000),
}).strict()
export const onboardingPatchSchema = z.object({
  step: z.number().int().min(1).max(3),
  skipped_steps: z.array(z.number().int().min(1).max(3)).max(3).optional(),
}).strict()
export type ShopSettings = z.infer<typeof shopSettingsSchema>
export function onboardingProgress(organization: { onboarding_step?: number; onboarding_skipped_steps?: number[]; onboarding_started_at?: string | null }, counts: { products: number; drivers: number; orders: number }) {
  const completed = { product: counts.products > 0, driver: counts.drivers > 0, order: counts.orders > 0 }
  const complete = Object.values(completed).every(Boolean)
  const firstMissing = !completed.product ? 1 : !completed.driver ? 2 : 3
  return { completed, complete, step: organization.onboarding_step ?? firstMissing,
    skipped_steps: organization.onboarding_skipped_steps ?? [],
    should_start: !organization.onboarding_started_at && counts.products === 0 && counts.drivers === 0 && counts.orders === 0 }
}
export type OnboardingProgress = ReturnType<typeof onboardingProgress>
export function loginDestination(role: string | null, platformAdmin: boolean, shouldStart: boolean) {
  return platformAdmin ? '/admin' : role === 'admin' ? shouldStart ? '/onboarding' : '/dashboard' : '/orders'
}
