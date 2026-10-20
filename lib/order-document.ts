import { z } from 'zod'
import type { Order } from '@/types/order'
import { orderAmounts } from '@/lib/order-amounts'

export const documentFormatSchema = z.enum(['a4', '58mm', '80mm'])
export type DocumentFormat = z.infer<typeof documentFormatSchema>
export function formatDocumentMoney(value: number) {
  return `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} FCFA`
}
export function buildOrderDocument(order: Order, organizationName: string, logoUrl: string | null = null) {
  const lines = (order.order_lines ?? []).map(line => ({
    name: line.product?.name ?? 'Produit', quantity: line.quantity,
    detail: line.pricing_type === 'offer' ? `${line.offer_name} : ${line.offer_count} offre(s) de ${line.units_per_offer} unités` : null,
    price: Number(line.pricing_type === 'offer' ? line.offer_price : line.unit_price),
    subtotal: Number(line.line_subtotal ?? Number(line.line_total ?? Number(line.unit_price ?? 0) * line.quantity) + Number(line.discount_amount ?? 0)),
    total: Number(line.line_total ?? Number(line.unit_price ?? 0) * line.quantity),
    discountAmount: Number(line.discount_amount ?? 0), discountReason: line.discount_reason ?? null,
  }))
  const amounts = orderAmounts(order.order_lines ?? [], order.delivery_fee, order.confirmation_amount)
  return {
    reference: order.id.slice(0, 8).toUpperCase(),
    date: new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Abidjan', dateStyle: 'short' }).format(new Date(`${order.order_date}T12:00:00Z`)),
    organizationName, logoUrl, clientName: order.client_name, clientPhone: order.client_phone,
    seller: order.seller?.full_name ?? 'Non renseigné', deliveryLocation: order.delivery_location,
    deliveryDriver: order.delivery_driver?.name ?? null, lines,
    totals: { ...amounts, subtotal: Math.round(lines.reduce((sum, line) => sum + line.subtotal, 0) * 100) / 100,
      discount: Math.round(lines.reduce((sum, line) => sum + line.discountAmount, 0) * 100) / 100 },
  }
}
export type OrderDocument = ReturnType<typeof buildOrderDocument>
