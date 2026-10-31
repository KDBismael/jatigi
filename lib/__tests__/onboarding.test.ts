import { describe, expect, it } from 'vitest'
import { onboardingProgress, onboardingPatchSchema, shopSettingsSchema, loginDestination } from '@/lib/onboarding'

describe('onboarding réel et paramètres boutique', () => {
  it('ne confond jamais étape sautée et création réelle', () => {
    const state = onboardingProgress({ onboarding_step: 3, onboarding_skipped_steps: [1, 2] }, { products: 0, drivers: 0, orders: 0 })
    expect(state.completed).toEqual({ product: false, driver: false, order: false })
    expect(state.complete).toBe(false)
    expect(state.step).toBe(3)
  })
  it('termine uniquement après les trois créations et reprend une étape incomplète', () => {
    expect(onboardingProgress({}, { products: 1, drivers: 1, orders: 1 }).complete).toBe(true)
    expect(onboardingProgress({}, { products: 1, drivers: 0, orders: 0 }).step).toBe(2)
    expect(onboardingPatchSchema.safeParse({ step: 3, organization_id: 'other' }).success).toBe(false)
    expect(onboardingPatchSchema.safeParse({ step: 4 }).success).toBe(false)
  })
  it('limite les pays Moneriz, devise XOF et frais non négatifs', () => {
    expect(shopSettingsSchema.safeParse({ name: 'Boutique', country: 'CI', currency: 'XOF', default_delivery_fee: 1000 }).success).toBe(true)
    for (const invalid of [{ country: 'FR' }, { currency: 'EUR' }, { default_delivery_fee: -1 }, { owner_id: 'other' }]) {
      expect(shopSettingsSchema.safeParse({ name: 'Boutique', country: 'CI', currency: 'XOF', default_delivery_fee: 0, ...invalid }).success).toBe(false)
    }
  })
  it('préserve les espaces plateforme/employés et ne force que le nouvel admin sans activité', () => {
    expect(loginDestination(null, true, true)).toBe('/admin')
    expect(loginDestination('employee', false, true)).toBe('/orders')
    expect(loginDestination('admin', false, true)).toBe('/onboarding')
    expect(loginDestination('admin', false, false)).toBe('/dashboard')
  })
})
it('advances beyond already created entities even when an earlier progress write failed',()=>{expect(onboardingProgress({onboarding_step:1},{products:1,drivers:0,orders:0}).step).toBe(2);expect(onboardingProgress({onboarding_step:2},{products:1,drivers:1,orders:0}).step).toBe(3)})
