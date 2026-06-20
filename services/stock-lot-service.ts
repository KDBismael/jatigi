import { createClient } from '@/services/supabase/server'
import type { StockLot } from '@/types/stock-lot'
import type { StockLotInput } from '@/lib/schemas/stock-lot.schema'
import { computeLotUnitCost } from '@/lib/lot-allocation'

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

  const import_cost =
    input.import_cost_type === 'unit'
      ? input.import_cost_raw
      : input.import_cost_raw / (input.import_batch_size ?? 1)

  const unit_cost = computeLotUnitCost({
    purchase_cost: input.purchase_cost,
    import_cost_type: input.import_cost_type,
    import_cost_raw: input.import_cost_raw,
    import_batch_size: input.import_batch_size ?? null,
    packaging_cost: input.packaging_cost,
  })

  const { data: lot, error: lotErr } = await supabase
    .from('stock_lots')
    .insert({
      product_id: productId,
      organization_id: organizationId,
      quantity_received: input.quantity_received,
      quantity_available: input.quantity_received,
      purchase_cost: input.purchase_cost,
      import_cost,
      import_cost_type: input.import_cost_type,
      import_cost_raw: input.import_cost_raw,
      import_batch_size: input.import_batch_size ?? null,
      packaging_cost: input.packaging_cost,
      unit_cost,
      received_at: input.received_at ?? new Date().toISOString(),
    })
    .select()
    .single()

  if (lotErr) throw new Error(lotErr.message)

  // Increment product stock via RPC (atomic, avoids race condition)
  const { error: incrErr } = await supabase.rpc('increment_product_stock', {
    p_product_id: productId,
    p_quantity: input.quantity_received,
  })
  if (incrErr) throw new Error(incrErr.message)

  // Update product cost fields to reflect the latest lot
  const { error: updateErr } = await supabase
    .from('products')
    .update({
      purchase_cost: input.purchase_cost,
      import_cost,
      import_cost_type: input.import_cost_type,
      import_cost_raw: input.import_cost_raw,
      import_batch_size: input.import_batch_size ?? null,
      packaging_cost: input.packaging_cost,
    })
    .eq('id', productId)

  if (updateErr) throw new Error(updateErr.message)

  return lot as StockLot
}
