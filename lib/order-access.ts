import type { Order } from '@/types/order'

/** Share selling prices/discounts with staff, never acquisition costs. */
export function orderForRole(order: Order, role: string) {
  if (role === 'admin') return order
  return {
    ...order,
    order_lines: order.order_lines?.map(line => ({
      id: line.id, order_id: line.order_id, product_id: line.product_id, quantity: line.quantity,
      unit_price: line.unit_price, pricing_type: line.pricing_type, product_offer_id: line.product_offer_id,
      offer_name: line.offer_name, units_per_offer: line.units_per_offer, offer_count: line.offer_count,
      offer_price: line.offer_price, line_subtotal: line.line_subtotal, line_total: line.line_total,
      discount_type: line.discount_type, discount_value: line.discount_value, discount_amount: line.discount_amount,
      discount_reason: line.discount_reason, discount_applied_by: line.discount_applied_by, discount_applied_at: line.discount_applied_at,
      product: line.product ? { name: line.product.name } : undefined,
    })),
  }
}
