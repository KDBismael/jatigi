import { describe, expect, it } from 'vitest'
import { calculateDeliveryMetrics } from '@/lib/delivery-metrics'

describe('calculateDeliveryMetrics', () => {
  it('compte les colis par état et uniquement les livrés comme encaissés', () => {
    const result = calculateDeliveryMetrics([
      { status: 'received', amount: 10_000 },
      { status: 'confirmed', amount: 15_000 },
      { status: 'in_progress', amount: 20_000 },
      { status: 'delivered', amount: 30_000 },
      { status: 'cancelled', amount: 40_000 },
    ], 0)
    expect(result.packages_assigned).toBe(5)
    expect(result.packages_in_progress).toBe(3)
    expect(result.packages_delivered).toBe(1)
    expect(result.packages_cancelled).toBe(1)
    expect(result.amount_collected).toBe(30_000)
  })

  it('calcule le taux de réussite sur les livraisons terminées', () => {
    const result = calculateDeliveryMetrics([
      { status: 'delivered', amount: 1 },
      { status: 'delivered', amount: 1 },
      { status: 'cancelled', amount: 1 },
    ], 0)
    expect(result.success_rate).toBe(67)
  })

  it('déduit les reversements du montant encaissé', () => {
    const result = calculateDeliveryMetrics([{ status: 'delivered', amount: 100_000 }], 35_000)
    expect(result.amount_due).toBe(65_000)
  })

  it('ne produit jamais un solde négatif', () => {
    const result = calculateDeliveryMetrics([{ status: 'delivered', amount: 10_000 }], 20_000)
    expect(result.amount_due).toBe(0)
  })

  it('laisse les frais de livraison au livreur : encaissé complet, à reverser sans les frais', () => {
    const result = calculateDeliveryMetrics([
      { status: 'delivered', amount: 6_000, remittable: 5_000 },
      { status: 'in_progress', amount: 9_000, remittable: 8_000 },
    ], 2_000)
    expect(result.amount_collected).toBe(6_000)
    expect(result.amount_delivery_fees).toBe(1_000)
    expect(result.amount_due).toBe(3_000)
  })
})
