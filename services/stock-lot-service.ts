import { createAdminClient, createClient } from '@/services/supabase/server'
import type { StockLot } from '@/types/stock-lot'
import type { StockLotInput } from '@/lib/schemas/stock-lot.schema'

export interface StockLotUpdate {
  quantity_available?: number
  total_purchase?: number
  total_transport?: number
  total_packaging?: number
  received_at?: string
}

export async function getStockLots(productId: string, organizationId: string): Promise<StockLot[]> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('stock_lots')
    .select('*')
    .eq('product_id', productId)
    .eq('organization_id', organizationId)
    .order('received_at', { ascending: true })
    .order('id', { ascending: true })

  if (error) throw new Error(error.message)
  return data as StockLot[]
}

export async function addStockLot(
  input: StockLotInput,
  productId: string,
  organizationId: string,
): Promise<StockLot> {
  const supabase = await createClient()
  const { data: lotId, error } = await supabase.rpc('add_stock_lot_safe', {
    p_product_id: productId,
    p_quantity: input.quantity_received,
    p_total_purchase: input.total_purchase,
    p_total_transport: input.total_transport,
    p_total_packaging: input.total_packaging,
    p_received_at: input.received_at || null,
  })
  if (error) throw new Error(error.message)
  const admin = await createAdminClient()
  const { data: lot, error: fetchError } = await admin.from('stock_lots').select('*')
    .eq('id', lotId).eq('organization_id', organizationId).single()
  if (fetchError) throw new Error(fetchError.message)
  return lot as StockLot
}

export async function updateStockLot(
  lotId: string,
  productId: string,
  input: StockLotUpdate,
  organizationId: string,
): Promise<StockLot> {
  const supabase = await createClient()
  const { data: updated, error } = await supabase.rpc('update_stock_lot_safe', {
    p_lot_id: lotId,
    p_product_id: productId,
    p_quantity_available: input.quantity_available ?? null,
    p_total_purchase: input.total_purchase ?? null,
    p_total_transport: input.total_transport ?? null,
    p_total_packaging: input.total_packaging ?? null,
    p_received_at: input.received_at ?? null,
  })
  if (error) throw new Error(error.message)
  if ((updated as StockLot).organization_id !== organizationId) throw new Error('Lot hors organisation')
  return updated as StockLot
}
