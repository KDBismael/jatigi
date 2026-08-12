import { describe, expect, it } from 'vitest'
import { orderSchema } from '@/lib/schemas/order.schema'

const baseOrder = {
  client_name: 'Mme Ouattara',
  client_phone: '0700000000',
  channel: 'whatsapp',
  order_date: '2026-08-12',
  seller_id: '11111111-1111-4111-8111-111111111111',
  live_session_id: '',
  delivery_driver_id: '',
  delivery_location: '',
  delivery_fee: 0,
  lines: [{ product_id: '22222222-2222-4222-8222-222222222222', quantity: 1 }],
}

describe('orderSchema deposit validation', () => {
  it('accepte une commande sans dépôt de réservation', () => {
    const result = orderSchema.safeParse({
      ...baseOrder,
      confirmation_amount: 0,
      payment_method: '',
    })
    expect(result.success).toBe(true)
  })

  it('accepte une commande avec dépôt et moyen de paiement', () => {
    const result = orderSchema.safeParse({
      ...baseOrder,
      confirmation_amount: 5_000,
      payment_method: 'wave',
    })
    expect(result.success).toBe(true)
  })

  it('refuse un dépôt sans moyen de paiement', () => {
    const result = orderSchema.safeParse({
      ...baseOrder,
      confirmation_amount: 5_000,
      payment_method: '',
    })
    expect(result.success).toBe(false)
  })

  it('refuse un moyen de paiement sans montant de dépôt', () => {
    const result = orderSchema.safeParse({
      ...baseOrder,
      confirmation_amount: 0,
      payment_method: 'wave',
    })
    expect(result.success).toBe(false)
  })
})
