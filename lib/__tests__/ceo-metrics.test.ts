import { describe, expect, it } from 'vitest'
import { computeCeoMetrics, progressPercent } from '@/lib/ceo-metrics'

describe('computeCeoMetrics', () => {
  it('reconnaît seulement les commandes livrées', () => {
    const result = computeCeoMetrics([
      { status: 'delivered', revenue: 100_000, cost: 40_000 },
      { status: 'cancelled', revenue: 80_000, cost: 20_000 },
      { status: 'in_progress', revenue: 50_000, cost: 10_000 },
    ], 15_000)
    expect(result).toMatchObject({ revenue: 100_000, cost_of_goods: 40_000, expense_total: 15_000, estimated_profit: 45_000, delivered_orders: 1, cancelled_orders: 1, average_basket: 100_000 })
  })

  it('ne redéduit pas un achat de stock hors dépenses fournies', () => {
    expect(computeCeoMetrics([{ status: 'delivered', revenue: 200_000, cost: 70_000 }], 20_000).estimated_profit).toBe(110_000)
  })
})

describe('progressPercent', () => {
  it('gère absence d’objectif et plafonne à 100', () => {
    expect(progressPercent(10, 0)).toBe(0)
    expect(progressPercent(120, 100)).toBe(100)
  })
})
