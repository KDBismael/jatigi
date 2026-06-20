import { createClient } from '@/services/supabase/server'
import type { Order } from '@/types/order'
import type { OrderInput, OrderStatusUpdate } from '@/lib/schemas/order.schema'

export async function getOrders(): Promise<Order[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_lines(*, product:products(name))')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as Order[]
}

export async function getOrderById(id: string): Promise<Order | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_lines(*, product:products(name, sale_price))')
    .eq('id', id)
    .single()

  if (error) return null
  return data as Order
}

export async function createOrder(input: OrderInput, userId: string, organizationId: string): Promise<Order> {
  const supabase = await createClient()

  const productIds = input.lines.map((l) => l.product_id)

  // Fetch product sale price + costs (costs used as fallback if FIFO lots don't exist)
  const { data: products, error: pErr } = await supabase
    .from('products')
    .select('id, sale_price, purchase_cost, import_cost, packaging_cost')
    .in('id', productIds)

  if (pErr) throw new Error(pErr.message)

  const productMap = new Map(products?.map((p) => [p.id, p]) ?? [])

  // Create order
  const { data: order, error: oErr } = await supabase
    .from('orders')
    .insert({
      client_name: input.client_name,
      client_phone: input.client_phone,
      channel: input.channel,
      order_date: input.order_date,
      status: 'received',
      created_by: userId,
      organization_id: organizationId,
    })
    .select()
    .single()

  if (oErr) throw new Error(oErr.message)

  for (const line of input.lines) {
    const product = productMap.get(line.product_id)
    if (!product) throw new Error(`Produit introuvable : ${line.product_id}`)

    // Fallback cost from product fields (covers case where FIFO lots don't exist yet)
    const fallbackCost = product.purchase_cost + product.import_cost + product.packaging_cost

    const { data: orderLine, error: lErr } = await supabase
      .from('order_lines')
      .insert({
        order_id: order.id,
        product_id: line.product_id,
        quantity: line.quantity,
        unit_price: product.sale_price,
        unit_cost: fallbackCost,
      })
      .select()
      .single()

    if (lErr) {
      await supabase.from('orders').delete().eq('id', order.id)
      throw new Error(lErr.message)
    }

    // Attempt FIFO allocation — updates unit_cost to weighted lot cost if successful
    const { data: weightedCost, error: fifoErr } = await supabase.rpc('consume_stock_fifo', {
      p_order_line_id: orderLine.id,
      p_product_id: line.product_id,
      p_org_id: organizationId,
      p_quantity: line.quantity,
    })

    if (fifoErr) {
      // FIFO RPC unavailable (migration not applied) or insufficient stock
      if (fifoErr.message?.includes('INSUFFICIENT_STOCK')) {
        await supabase.from('orders').delete().eq('id', order.id)
        throw new Error(`Stock insuffisant pour ce produit`)
      }
      // Otherwise: FIFO not set up yet — fallback cost stays, continue without lot tracking
    } else if (weightedCost !== null) {
      await supabase
        .from('order_lines')
        .update({ unit_cost: weightedCost })
        .eq('id', orderLine.id)
    }
  }

  return order as Order
}

export async function updateOrderStatus(id: string, update: OrderStatusUpdate): Promise<Order> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .update({ status: update.status })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Order
}
