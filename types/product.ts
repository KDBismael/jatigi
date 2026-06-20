export type ImportCostType = 'unit' | 'carton' | 'lot' | 'container'

export interface Product {
  id: string
  name: string
  purchase_cost: number
  import_cost: number
  import_cost_type: ImportCostType
  import_cost_raw: number
  import_batch_size: number | null
  packaging_cost: number
  sale_price: number
  stock_quantity: number
  created_at: string
  updated_at: string
}

export interface ProductPublic {
  id: string
  name: string
  sale_price: number
  stock_quantity: number
  created_at: string
}
