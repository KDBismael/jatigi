import type { Order } from '@/types/order'
import type { OrderStatus } from '@/lib/constants'

/** Share selling prices/discounts with staff, never acquisition costs. */
export function orderForRole(order: Order, role: string) {
  if (role === 'admin') return order
  return {
    ...order,
    order_lines: order.order_lines?.map(line => ({
      id: line.id, order_id: line.order_id, product_id: line.product_id, variant_id: line.variant_id, variant_name: line.variant_name, quantity: line.quantity,
      unit_price: line.unit_price, pricing_type: line.pricing_type, product_offer_id: line.product_offer_id,
      offer_name: line.offer_name, units_per_offer: line.units_per_offer, offer_count: line.offer_count,
      offer_price: line.offer_price, line_subtotal: line.line_subtotal, line_total: line.line_total,
      discount_type: line.discount_type, discount_value: line.discount_value, discount_amount: line.discount_amount,
      discount_reason: line.discount_reason, discount_applied_by: line.discount_applied_by, discount_applied_at: line.discount_applied_at,
      product: line.product ? { name: line.product.name } : undefined,
    })),
  }
}

/** Statuses a delivery manager may set. */
export const DELIVERY_STATUSES = ['in_progress', 'delivered', 'cancelled', 'postponed', 'returned'] as const
/** Orders a delivery manager handles: handed to a driver, from confirmation onwards. */
const MANAGER_STATUSES: readonly string[] = ['confirmed', ...DELIVERY_STATUSES]
export function isDeliveryOrder(order: Pick<Order, 'status' | 'delivery_driver_id'>) {
  return Boolean(order.delivery_driver_id) && MANAGER_STATUSES.includes(order.status)
}
/** Manager status menu: the current status stays visible but only delivery statuses can be chosen. */
export function managerStatusOptions(current: OrderStatus): readonly OrderStatus[] {
  return (DELIVERY_STATUSES as readonly string[]).includes(current) ? DELIVERY_STATUSES : [current, ...DELIVERY_STATUSES]
}
