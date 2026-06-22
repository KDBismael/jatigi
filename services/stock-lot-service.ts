import { createClient } from '@/services/supabase/server'
import type { StockLot } from '@/types/stock-lot'
import type { StockLotInput } from '@/lib/schemas/stock-lot.schema'

export async function getStockLots(productId: string): Promise<StockLot[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stock_lots')
    .select('*')
    .eq('product_id', productId)
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

  const qty = input.quantity_received
  const purchase_cost = input.total_purchase / qty
  const import_cost = input.total_transport / qty
  const packaging_cost = input.total_packaging / qty
  const unit_cost = purchase_cost + import_cost + packaging_cost

  const { data: lot, error: lotErr } = await supabase
    .from('stock_lots')
    .insert({
      product_id: productId,
      organization_id: organizationId,
      quantity_received: qty,
      quantity_available: qty,
      purchase_cost,
      import_cost,
      import_cost_type: 'lot',
      import_cost_raw: input.total_transport,
      import_batch_size: qty,
      packaging_cost,
      unit_cost,
      received_at: input.received_at ?? new Date().toISOString(),
    })
    .select()
    .single()

  if (lotErr) throw new Error(lotErr.message)

  // Increment product stock
  const { error: incrErr } = await supabase.rpc('increment_product_stock', {
    p_product_id: productId,
    p_quantity: qty,
  })
  if (incrErr) throw new Error(incrErr.message)

  // Update product cost fields to reflect this latest lot
  const { error: updateErr } = await supabase
    .from('products')
    .update({
      purchase_cost,
      import_cost,
      import_cost_type: 'lot',
      import_cost_raw: input.total_transport,
      import_batch_size: qty,
      packaging_cost,
    })
    .eq('id', productId)

  if (updateErr) throw new Error(updateErr.message)

  return lot as StockLot
}
