export type ImportCostType = 'unit' | 'carton' | 'lot' | 'container'
export type PricingMode = 'unit' | 'offers' | 'both'

export interface ProductOffer {
  id: string
  product_id: string
  organization_id: string
  name: string
  units_per_offer: number
  price: number
  is_active: boolean
  created_at: string
  updated_at: string
}

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
  pricing_mode: PricingMode
  stock_quantity: number
  is_active: boolean
  created_at: string
  updated_at: string
  offers?: ProductOffer[]
}

export interface ProductPublic {
  id: string
  name: string
  sale_price: number
  pricing_mode: PricingMode
  stock_quantity: number
  is_active: boolean
  created_at: string
  offers?: ProductOffer[]
}
