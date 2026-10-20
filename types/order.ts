import { Channel, OrderStatus, PaymentMethod } from '@/lib/constants'
import type { DeliveryDriver } from '@/types/delivery-driver'

export interface OrderLine {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number | null
  unit_cost: number
  pricing_type: 'unit' | 'offer'
  product_offer_id: string | null
  offer_name: string | null
  units_per_offer: number | null
  offer_count: number | null
  offer_price: number | null
  line_total: number
  total_cost: number
  line_subtotal?: number
  discount_type?: 'none' | 'amount' | 'percent'
  discount_value?: number
  discount_amount?: number
  discount_reason?: string | null
  discount_applied_by?: string | null
  discount_applied_at?: string | null
  product?: {
    name: string
    purchase_cost?: number
    import_cost?: number
    packaging_cost?: number
  }
}

export interface Order {
  id: string
  client_name: string
  client_phone: string | null
  channel: Channel
  status: OrderStatus
  confirmation_amount: number
  payment_method: PaymentMethod | null
  order_date: string
  created_by: string | null
  seller_id: string
  live_session_id: string | null
  delivered_at: string | null
  discounts_locked_at?: string | null
  created_at: string
  updated_at: string
  delivery_driver_id: string | null
  delivery_location: string | null
  delivery_fee: number
  delivery_driver?: Pick<DeliveryDriver, 'id' | 'name' | 'phone'> | null
  seller?: { id: string; full_name: string } | null
  live_session?: { id: string; name: string | null; session_date: string; slot: 'morning' | 'afternoon' | 'evening' } | null
  order_lines?: OrderLine[]
}
