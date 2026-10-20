import { describe, expect, it } from 'vitest'
import { calculateDiscount, discountSchema, discountUpdateSchema } from '@/lib/discounts'

describe('remises par ligne', () => {
  it('déduit le montant fixe du total de la ligne, pas de chaque unité', () => {
    expect(calculateDiscount(15000, { discount_type: 'amount', discount_value: 1000, discount_reason: 'Promotion' })).toEqual({ subtotal: 15000, discountAmount: 1000, total: 14000 })
  })
  it('calcule les pourcentages et arrondit les centimes', () => {
    expect(calculateDiscount(99.99, { discount_type: 'percent', discount_value: 12.5, discount_reason: 'Promotion' })).toEqual({ subtotal: 99.99, discountAmount: 12.50, total: 87.49 })
  })
  it('accepte une remise de 100 %, aucune remise et la suppression', () => {
    expect(calculateDiscount(200, { discount_type: 'percent', discount_value: 100, discount_reason: 'Cadeau' }).total).toBe(0)
    expect(calculateDiscount(200, {}).total).toBe(200)
    expect(calculateDiscount(200, { discount_type: 'none', discount_value: 0 }).discountAmount).toBe(0)
  })
  it('refuse les montants excessifs, négatifs, non finis et les motifs blancs', () => {
    for (const input of [
      { discount_type: 'amount', discount_value: 201, discount_reason: 'Promotion' },
      { discount_type: 'percent', discount_value: 101, discount_reason: 'Promotion' },
      { discount_type: 'amount', discount_value: -1, discount_reason: 'Promotion' },
      { discount_type: 'amount', discount_value: Infinity, discount_reason: 'Promotion' },
      { discount_type: 'amount', discount_value: 10, discount_reason: '  ' },
      { discount_type: 'none', discount_value: 10 },
    ]) expect(() => calculateDiscount(200, input as Parameters<typeof calculateDiscount>[1])).toThrow()
    expect(discountSchema.safeParse({ discount_type: 'percent', discount_value: 101, discount_reason: 'Promo' }).success).toBe(false)
  })
  it('refuse les modifications de ligne en double', () => {
    const line = { id: '11111111-1111-4111-8111-111111111111', discount_type: 'none', discount_value: 0 }
    expect(discountUpdateSchema.safeParse({ lines: [line, line] }).success).toBe(false)
  })
})
