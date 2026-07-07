import { createAdminClient, createClient } from '@/services/supabase/server'
import type { Order } from '@/types/order'
import type { OrderInput, OrderStatusUpdate } from '@/lib/schemas/order.schema'
import type { Channel, OrderStatus, PaymentMethod } from '@/lib/constants'
import { nextStatusForConfirmation } from '@/lib/order-amounts'

export interface OrderUpdate {
  client_name?: string
  client_phone?: string | null
  channel?: Channel
  order_date?: string
  delivery_driver_id?: string | null
  delivery_location?: string | null
  confirmation_amount?: number
  payment_method?: PaymentMethod | '' | null
}

export async function getOrders(organizationId: string): Promise<Order[]> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('orders')
    .select('*, delivery_driver:delivery_drivers(id, name, phone), order_lines(*, product:products(name))')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as Order[]
}

export async function getOrderById(id: string, organizationId: string): Promise<Order | null> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('orders')
    .select('*, delivery_driver:delivery_drivers(id, name, phone), order_lines(*, product:products(name, purchase_cost, import_cost, packaging_cost))')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single()

  if (error) return null
  return data as Order
}

export async function createOrder(input: OrderInput, userId: string, organizationId: string): Promise<Order> {
  const supabase = await createClient()
  void userId
  void organizationId
  const { data: orderId, error } = await supabase.rpc('create_order_with_fifo', {
    p_client_name: input.client_name,
    p_client_phone: input.client_phone || null,
    p_channel: input.channel,
    p_order_date: input.order_date,
    p_delivery_driver_id: input.delivery_driver_id || null,
    p_delivery_location: input.delivery_location || null,
    p_confirmation_amount: input.confirmation_amount ?? 0,
    p_payment_method: input.payment_method || null,
    p_lines: input.lines,
  })
  if (error) {
    if (error.message.includes('INSUFFICIENT_STOCK')) throw new Error('Stock insuffisant pour ce produit')
    throw new Error(error.message)
  }
  const order = await getOrderById(orderId as string, organizationId)
  if (!order) throw new Error('Commande créée mais introuvable')
  return order
}

export async function updateOrder(id: string, input: OrderUpdate, organizationId: string): Promise<Order> {
  const supabase = await createAdminClient()
  if (input.delivery_driver_id) {
    const { data: driver } = await supabase.from('delivery_drivers').select('id')
      .eq('id', input.delivery_driver_id).eq('organization_id', organizationId).single()
    if (!driver) throw new Error('Livreur introuvable dans votre organisation')
  }

  const update: Record<string, unknown> = { ...input }

  if (input.delivery_location !== undefined) update.delivery_location = input.delivery_location || null

  // A confirmation change flips the order between the two initial states.
  if (input.confirmation_amount !== undefined) {
    const { data: current } = await supabase.from('orders').select('status')
      .eq('id', id).eq('organization_id', organizationId).single()
    if (!current) throw new Error('Commande introuvable')
    update.confirmation_amount = input.confirmation_amount
    update.payment_method = input.payment_method || null
    update.status = nextStatusForConfirmation(current.status as OrderStatus, input.confirmation_amount)
  }

  const { error } = await supabase
    .from('orders')
    .update(update)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  const order = await getOrderById(id, organizationId)
  if (!order) throw new Error('Commande introuvable')
  return order
}

export async function updateOrderStatus(id: string, update: OrderStatusUpdate, organizationId: string): Promise<Order> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('update_order_status_safe', { p_order_id: id, p_status: update.status })
  if (error) throw new Error(error.message)
  const order = await getOrderById(id, organizationId)
  if (!order) throw new Error('Commande introuvable')
  return order
}
