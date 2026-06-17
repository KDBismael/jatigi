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

  // Fetch product costs for snapshot
  const productIds = input.lines.map((l) => l.product_id)
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

  // Insert order lines with cost snapshots (trigger will decrement stock)
  const lines = input.lines.map((l) => {
    const product = productMap.get(l.product_id)
    if (!product) throw new Error(`Produit introuvable: ${l.product_id}`)
    return {
      order_id: order.id,
      product_id: l.product_id,
      quantity: l.quantity,
      unit_price: product.sale_price,
      unit_cost: product.purchase_cost + product.import_cost + product.packaging_cost,
    }
  })

  const { error: lErr } = await supabase.from('order_lines').insert(lines)
  if (lErr) throw new Error(lErr.message)

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
