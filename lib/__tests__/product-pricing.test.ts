import { describe, expect, it } from 'vitest'
import { calculateOfferSale, calculateUnitSale } from '@/lib/product-pricing'

describe('product pricing', () => {
  it('calcule une vente unitaire sans modifier le prix', () => {
    expect(calculateUnitSale(1_500, 5)).toEqual({ stockQuantity: 5, revenue: 7_500 })
  })

  it('calcule le stock et le CA depuis le prix fixe de l’offre', () => {
    expect(calculateOfferSale({ units_per_offer: 3, price: 6_000 }, 2))
      .toEqual({ stockQuantity: 6, revenue: 12_000 })
    expect(calculateOfferSale({ units_per_offer: 12, price: 18_000 }, 3))
      .toEqual({ stockQuantity: 36, revenue: 54_000 })
  })

  it('autorise deux offres de même quantité avec des prix différents', () => {
    expect(calculateOfferSale({ units_per_offer: 12, price: 20_000 }, 1).revenue).toBe(20_000)
    expect(calculateOfferSale({ units_per_offer: 12, price: 17_000 }, 1).revenue).toBe(17_000)
  })
})
