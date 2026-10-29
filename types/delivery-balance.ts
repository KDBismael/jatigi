export type DeliveryDayStatus = 'in_progress' | 'delivered' | 'cancelled' | 'postponed'
export interface DeliveryDayOrder {
  assignmentId: string
  orderId: string
  clientName: string
  clientPhone: string | null
  products: string
  status: DeliveryDayStatus
  remittableAmount: number
}
export interface DeliveryDayDriver {
  driverId: string
  driverName: string
  isActive: boolean
  counts: Record<DeliveryDayStatus, number>
  expectedRemittance: number
  orders: DeliveryDayOrder[]
}
export interface DeliveryDayReport {
  date: string
  drivers: DeliveryDayDriver[]
  undatedOrders: number
}
