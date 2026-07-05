import { describe, expect, it } from 'vitest'
import {
  summarizeUsers,
  summarizeOrders,
  summarizeDeliveries,
  revenueProfitFromDelivered,
} from '@/lib/platform-metrics'

describe('summarizeUsers', () => {
  it('compte les utilisateurs par rôle et les propriétaires', () => {
    const result = summarizeUsers(
      [
        { id: 'a', role: 'admin' },
        { id: 'b', role: 'admin' },
        { id: 'c', role: 'employee' },
      ],
      ['a'],
    )
    expect(result).toEqual({ users_count: 3, admins: 2, employees: 1, owners: 1 })
  })
})

describe('summarizeOrders', () => {
  it('compte le total et par statut', () => {
    const result = summarizeOrders([
      { status: 'received' },
      { status: 'confirmed' },
      { status: 'delivered' },
      { status: 'delivered' },
      { status: 'cancelled' },
    ])
    expect(result.total).toBe(5)
    expect(result.by_status).toEqual({
      received: 1,
      confirmed: 1,
      in_progress: 0,
      delivered: 2,
      cancelled: 1,
    })
  })
})

describe('summarizeDeliveries', () => {
  it('collecté = collectible des livrées, reversé = settlements, dû = différence', () => {
    const orders = [
      { status: 'delivered', confirmation_amount: 4_000, order_lines: [{ unit_price: 10_000, quantity: 1 }] }, // collectible 6000
      { status: 'delivered', confirmation_amount: 0, order_lines: [{ unit_price: 5_000, quantity: 2 }] }, // 10000
      { status: 'in_progress', confirmation_amount: 0, order_lines: [{ unit_price: 99_000, quantity: 1 }] }, // ignored
    ]
    const result = summarizeDeliveries(orders, [{ amount: 3_000 }, { amount: 1_000 }])
    expect(result.collected).toBe(16_000)
    expect(result.remitted).toBe(4_000)
    expect(result.due).toBe(12_000)
  })

  it('ne produit jamais un solde dû négatif', () => {
    const result = summarizeDeliveries(
      [{ status: 'delivered', confirmation_amount: 0, order_lines: [{ unit_price: 1_000, quantity: 1 }] }],
      [{ amount: 5_000 }],
    )
    expect(result.due).toBe(0)
  })
})

describe('revenueProfitFromDelivered', () => {
  it('somme le CA et le bénéfice des commandes livrées uniquement', () => {
    const orders = [
      {
        status: 'delivered',
        order_lines: [{ unit_price: 10_000, unit_cost: 6_000, quantity: 2, product: null }],
      },
      {
        status: 'cancelled',
        order_lines: [{ unit_price: 99_000, unit_cost: 1, quantity: 1, product: null }],
      },
    ]
    const result = revenueProfitFromDelivered(orders)
    expect(result.revenue).toBe(20_000)
    expect(result.profit).toBe(8_000)
  })
})
