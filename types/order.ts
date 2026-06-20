import { Channel, OrderStatus } from '@/lib/constants'

export interface OrderLine {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  unit_cost: number
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
  order_date: string
  created_by: string | null
  created_at: string
  updated_at: string
  order_lines?: OrderLine[]
}
