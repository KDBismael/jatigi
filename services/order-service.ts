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

export async function createOrder(input: OrderInput, userId: string, organizationId: string): Promise<Order> {
  const supabase = await createClient()

  // Fetch sale prices for snapshot (costs come from lots via FIFO RPC)
  const productIds = input.lines.map((l) => l.product_id)
  const { data: products, error: pErr } = await supabase
    .from('products')
    .select('id, sale_price')
    .in('id', productIds)

  if (pErr) throw new Error(pErr.message)

  const priceMap = new Map(products?.map((p) => [p.id, p.sale_price]) ?? [])

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

  // Insert order lines, then consume stock FIFO (RPC handles lot allocation atomically)
  for (const line of input.lines) {
    const sale_price = priceMap.get(line.product_id)
    if (sale_price === undefined) throw new Error(`Produit introuvable : ${line.product_id}`)

    // Insert order line with placeholder unit_cost — will be updated by FIFO RPC
    const { data: orderLine, error: lErr } = await supabase
      .from('order_lines')
      .insert({
        order_id: order.id,
        product_id: line.product_id,
        quantity: line.quantity,
        unit_price: sale_price,
        unit_cost: 0, // overwritten below
      })
      .select()
      .single()

    if (lErr) throw new Error(lErr.message)

    // Consume stock FIFO — returns weighted unit cost; throws on insufficient stock
    const { data: weightedCost, error: fifoErr } = await supabase.rpc('consume_stock_fifo', {
      p_order_line_id: orderLine.id,
      p_product_id: line.product_id,
      p_org_id: organizationId,
      p_quantity: line.quantity,
    })

    if (fifoErr) {
      // Roll back by deleting the order (cascade removes order_lines)
      await supabase.from('orders').delete().eq('id', order.id)
      throw new Error(fifoErr.message)
    }

    // Update unit_cost with the actual weighted cost from lot allocation
    await supabase
      .from('order_lines')
      .update({ unit_cost: weightedCost })
      .eq('id', orderLine.id)
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
