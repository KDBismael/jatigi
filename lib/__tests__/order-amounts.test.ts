import { describe, expect, it } from 'vitest'
import { orderTotal, orderCollectibleAmount, orderAmounts, orderRemittableAmount, nextStatusForConfirmation } from '@/lib/order-amounts'

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

  it('utilise le total exact d’une offre sans prix unitaire artificiel', () => {
    expect(orderTotal([{ line_total: 54_000, unit_price: null, quantity: 36 }])).toBe(54_000)
  })
})

describe('orderAmounts', () => {
  it('additionne colis et livraison puis déduit l’acompte', () => {
    expect(orderAmounts([{unit_price:5_000,quantity:2},{unit_price:2_000,quantity:1}], 1_500, 4_000)).toEqual({parcelAmount:12_000,deliveryFee:1_500,totalAmount:13_500,confirmationAmount:4_000,remainingAmount:9_500})
  })
  it('normalise les valeurs négatives et ne produit pas un reste négatif', () => {
    expect(orderAmounts([], -100, 500)).toEqual({parcelAmount:0,deliveryFee:0,totalAmount:0,confirmationAmount:500,remainingAmount:0})
  })
})

describe('orderRemittableAmount', () => {
  it('le livreur garde les frais de livraison : seul le colis moins l’acompte revient à la boutique', () => {
    const lines = [{ unit_price: 5_000, quantity: 1 }]
    expect(orderCollectibleAmount(lines, 0, 1_000)).toBe(6_000)
    expect(orderRemittableAmount(lines, 0)).toBe(5_000)
    expect(orderRemittableAmount(lines, 2_000)).toBe(3_000)
  })
  it('ne descend jamais en dessous de 0 quand l’acompte couvre déjà le colis', () => {
    expect(orderRemittableAmount([{ unit_price: 5_000, quantity: 1 }], 5_500)).toBe(0)
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
