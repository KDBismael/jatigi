import { describe, expect, it } from 'vitest'
import { orderTotal, orderCollectibleAmount, nextStatusForConfirmation } from '@/lib/order-amounts'

describe('orderTotal', () => {
  it('additionne prix unitaire × quantité de chaque ligne', () => {
    expect(orderTotal([
      { unit_price: 5_000, quantity: 2 },
      { unit_price: 3_000, quantity: 1 },
    ])).toBe(13_000)
  })

  it('retourne 0 pour une commande sans ligne', () => {
    expect(orderTotal([])).toBe(0)
  })
})

describe('orderCollectibleAmount', () => {
  it('retourne le total quand il n’y a pas de confirmation', () => {
    expect(orderCollectibleAmount([{ unit_price: 10_000, quantity: 1 }], 0)).toBe(10_000)
  })

  it('déduit le montant de confirmation du total', () => {
    expect(orderCollectibleAmount([{ unit_price: 10_000, quantity: 1 }], 4_000)).toBe(6_000)
  })

  it('ne descend jamais en dessous de 0', () => {
    expect(orderCollectibleAmount([{ unit_price: 10_000, quantity: 1 }], 15_000)).toBe(0)
  })
})

describe('nextStatusForConfirmation', () => {
  it('passe de reçue à confirmée quand un montant est saisi', () => {
    expect(nextStatusForConfirmation('received', 5_000)).toBe('confirmed')
  })

  it('revient de confirmée à reçue quand le montant est effacé', () => {
    expect(nextStatusForConfirmation('confirmed', 0)).toBe('received')
  })

  it('reste confirmée tant qu’un montant est présent', () => {
    expect(nextStatusForConfirmation('confirmed', 5_000)).toBe('confirmed')
  })

  it('ne modifie pas un statut de livraison avancé', () => {
    expect(nextStatusForConfirmation('in_progress', 5_000)).toBe('in_progress')
    expect(nextStatusForConfirmation('delivered', 0)).toBe('delivered')
    expect(nextStatusForConfirmation('cancelled', 5_000)).toBe('cancelled')
  })
})
