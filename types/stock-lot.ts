import type { ImportCostType } from './product'

export interface StockLot {
  id: string
  product_id: string
  organization_id: string
  quantity_received: number
  quantity_available: number
  purchase_cost: number
  import_cost: number
  import_cost_type: ImportCostType
  import_cost_raw: number
  import_batch_size: number | null
  packaging_cost: number
  unit_cost: number
  received_at: string
  created_at: string
}
