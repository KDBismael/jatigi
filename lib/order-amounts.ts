import type { OrderStatus } from '@/lib/constants'

interface AmountLine {
  unit_price: number
  quantity: number
}

/** Sum of unit_price × quantity across every order line. */
export function orderTotal(lines: AmountLine[]): number {
  return lines.reduce((sum, line) => sum + Number(line.unit_price) * line.quantity, 0)
}

/**
 * Amount the delivery driver must collect / reverse: the order total minus the
 * confirmation deposit already paid by the customer, floored at 0.
 */
export function orderCollectibleAmount(lines: AmountLine[], confirmationAmount: number, deliveryFee = 0): number {
  return orderAmounts(lines, deliveryFee, confirmationAmount).remainingAmount
}

export function orderAmounts(lines: AmountLine[], deliveryFee = 0, confirmationAmount = 0) {
  const parcelAmount = orderTotal(lines)
  const safeDeliveryFee = Math.max(0, Number(deliveryFee || 0))
  const totalAmount = parcelAmount + safeDeliveryFee
  const safeConfirmation = Math.max(0, Number(confirmationAmount || 0))
  return { parcelAmount, deliveryFee: safeDeliveryFee, totalAmount,
    confirmationAmount: safeConfirmation, remainingAmount: Math.max(0, totalAmount - safeConfirmation) }
}

/**
 * Derive the order status from its confirmation amount. Only toggles between the
 * two initial states (received ↔ confirmed); never overrides a driver has-picked-up
 * (in_progress), delivered, or cancelled order.
 */
export function nextStatusForConfirmation(current: OrderStatus, confirmationAmount: number): OrderStatus {
  if (current === 'received' || current === 'confirmed') {
    return Number(confirmationAmount || 0) > 0 ? 'confirmed' : 'received'
  }
  return current
}
