import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { buildOrderDocument, formatDocumentMoney, documentFormatSchema } from '@/lib/order-document'
import { generateOrderPdf } from '@/services/order-pdf'
import type { Order } from '@/types/order'

const order = {
  id: 'abcd1234-0000-4000-8000-000000000001', order_date: '2026-10-20', client_name: 'Mme Ouattara', client_phone: '0701020304',
  delivery_fee: 500, confirmation_amount: 1000, delivery_location: 'Cocody', seller: { full_name: 'Awa' },
  order_lines: [{ product: { name: 'Parfum été', purchase_cost: 123456789 }, quantity: 3, unit_price: 5000, line_subtotal: 15000, line_total: 14000,
    discount_amount: 1000, discount_type: 'amount', discount_reason: 'Promotion spéciale', unit_cost: 123456789 }],
} as Order

describe('document de commande', () => {
  it('partage les mêmes montants nets et ne contient aucun coût', () => {
    const model = buildOrderDocument(order, 'Parfumerie')
    expect(model.totals).toMatchObject({ subtotal: 15000, discount: 1000, totalAmount: 14500, remainingAmount: 13500 })
    expect(model.lines[0].discountReason).toBe('Promotion spéciale')
    expect(JSON.stringify(model)).not.toContain('123456789')
    expect(formatDocumentMoney(12.5)).toContain('12,50')
    expect(documentFormatSchema.safeParse('invalid').success).toBe(false)
  })
  it('produit les trois formats PDF avec les bonnes dimensions', async () => {
    for (const [format, width] of [['a4', 595.28], ['58mm', 164.41], ['80mm', 226.77]] as const) {
      const bytes = await generateOrderPdf(buildOrderDocument(order, 'Parfumerie'), format)
      const pdf = await PDFDocument.load(bytes)
      expect(pdf.getPageCount()).toBe(1)
      expect(pdf.getPage(0).getWidth()).toBeCloseTo(width, 1)
      expect(bytes.byteLength).toBeGreaterThan(2000)
    }
  }, 15000)
  it('pagine les longues commandes A4 et ajuste la hauteur des tickets', async () => {
    const model = buildOrderDocument(order, 'Parfumerie')
    model.lines = Array.from({ length: 45 }, () => ({ ...model.lines[0], name: 'Produit avec une très longue description '.repeat(3), discountReason: 'Promotion pour client fidèle '.repeat(5) }))
    const a4 = await PDFDocument.load(await generateOrderPdf(model, 'a4'))
    const ticket = await PDFDocument.load(await generateOrderPdf(model, '58mm'))
    expect(a4.getPageCount()).toBeGreaterThan(1)
    expect(ticket.getPage(0).getHeight()).toBeGreaterThan(842)
  }, 15000)
})
