import { createClient } from '@/services/supabase/server'
import type { StockLot } from '@/types/stock-lot'
import type { StockLotInput } from '@/lib/schemas/stock-lot.schema'

export interface StockLotUpdate {
  sale_price?: number
  quantity_available?: number
  total_purchase?: number
  total_transport?: number
  total_packaging?: number
  received_at?: string
}

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

// Recompute and persist the weighted average sale_price on the product
async function syncProductSalePrice(supabase: Awaited<ReturnType<typeof import('@/services/supabase/server').createClient>>, productId: string) {
  const { data: lots } = await supabase
    .from('stock_lots')
    .select('quantity_available, sale_price')
    .eq('product_id', productId)
    .gt('quantity_available', 0)

  const totalQty = lots?.reduce((s, l) => s + l.quantity_available, 0) ?? 0
  if (totalQty === 0) return

  const weighted = (lots?.reduce((s, l) => s + l.quantity_available * l.sale_price, 0) ?? 0) / totalQty
  await supabase
    .from('products')
    .update({ sale_price: Math.round(weighted) })
    .eq('id', productId)
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
      sale_price: input.sale_price,
      received_at: input.received_at ?? new Date().toISOString(),
    })
    .select()
    .single()

  if (lotErr) throw new Error(lotErr.message)

  const { error: incrErr } = await supabase.rpc('increment_product_stock', {
    p_product_id: productId,
    p_quantity: qty,
  })
  if (incrErr) throw new Error(incrErr.message)

  // Update product cost fields from latest lot
  await supabase.from('products').update({
    purchase_cost,
    import_cost,
    import_cost_type: 'lot',
    import_cost_raw: input.total_transport,
    import_batch_size: qty,
    packaging_cost,
  }).eq('id', productId)

  await syncProductSalePrice(supabase, productId)

  return lot as StockLot
}

export async function updateStockLot(
  lotId: string,
  productId: string,
  input: StockLotUpdate,
): Promise<StockLot> {
  const supabase = await createClient()

  // Fetch current lot to fill in missing totals for cost recomputation
  const { data: current, error: fetchErr } = await supabase
    .from('stock_lots')
    .select('*')
    .eq('id', lotId)
    .single()
  if (fetchErr) throw new Error(fetchErr.message)

  const patch: Record<string, unknown> = {}

  // Recompute unit costs if any total amount changed
  const hasCostChange = input.total_purchase !== undefined
    || input.total_transport !== undefined
    || input.total_packaging !== undefined

  if (hasCostChange) {
    const qty = current.quantity_received
    const total_purchase = input.total_purchase ?? (current.purchase_cost * qty)
    const total_transport = input.total_transport ?? (current.import_cost * qty)
    const total_packaging = input.total_packaging ?? (current.packaging_cost * qty)

    patch.purchase_cost = total_purchase / qty
    patch.import_cost = total_transport / qty
    patch.packaging_cost = total_packaging / qty
    patch.unit_cost = (total_purchase + total_transport + total_packaging) / qty
    patch.import_cost_raw = total_transport
  }

  if (input.sale_price !== undefined) patch.sale_price = input.sale_price
  if (input.quantity_available !== undefined) {
    patch.quantity_available = input.quantity_available
    // Sync product stock_quantity: adjust by the difference
    const diff = input.quantity_available - current.quantity_available
    if (diff !== 0) {
      await supabase.from('products').update({
        stock_quantity: Math.max(0, (current.quantity_received ?? 0) + diff),
      }).eq('id', productId)
      // Use rpc for precise delta
      await supabase.rpc('increment_product_stock', {
        p_product_id: productId,
        p_quantity: diff,
      })
    }
  }
  if (input.received_at !== undefined) patch.received_at = input.received_at

  const { data: updated, error } = await supabase
    .from('stock_lots')
    .update(patch)
    .eq('id', lotId)
    .select()
    .single()
  if (error) throw new Error(error.message)

  await syncProductSalePrice(supabase, productId)

  return updated as StockLot
}
