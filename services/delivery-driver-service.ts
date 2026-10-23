import { createAdminClient } from '@/services/supabase/server'
import type { DeliveryDriverInput, DeliverySettlementInput } from '@/lib/schemas/delivery-driver.schema'
import type { DeliveryDriver, DeliveryDriverSummary } from '@/types/delivery-driver'
import { calculateDeliveryMetrics } from '@/lib/delivery-metrics'
import { orderCollectibleAmount, orderRemittableAmount } from '@/lib/order-amounts'

export async function getDeliveryDrivers(organizationId: string): Promise<DeliveryDriverSummary[]> {
  const supabase = await createAdminClient()
  const [{ data: drivers, error: driversError }, { data: orders, error: ordersError }, { data: settlements, error: settlementsError }] = await Promise.all([
    supabase.from('delivery_drivers').select('*').eq('organization_id', organizationId).order('name'),
    supabase.from('orders').select('delivery_driver_id, status, confirmation_amount, delivery_fee, order_lines(line_total, unit_price, quantity)').eq('organization_id', organizationId).not('delivery_driver_id', 'is', null),
    supabase.from('delivery_settlements').select('delivery_driver_id, amount').eq('organization_id', organizationId),
  ])
  if (driversError) throw new Error(driversError.message)
  if (ordersError) throw new Error(ordersError.message)
  if (settlementsError) throw new Error(settlementsError.message)

  return (drivers as DeliveryDriver[]).map((driver) => {
    const assigned = orders?.filter((order) => order.delivery_driver_id === driver.id) ?? []
    const metricOrders = assigned.map((order) => {
      const lines = (order.order_lines as unknown as { line_total?: number; unit_price?: number | null; quantity: number }[]) ?? []
      const deposit = Number(order.confirmation_amount ?? 0)
      return { status: order.status, amount: orderCollectibleAmount(lines, deposit, Number(order.delivery_fee ?? 0)), remittable: orderRemittableAmount(lines, deposit) }
    })
    const amountRemitted = settlements
      ?.filter((settlement) => settlement.delivery_driver_id === driver.id)
      .reduce((sum, settlement) => sum + Number(settlement.amount), 0) ?? 0

    return {
      ...driver,
      ...calculateDeliveryMetrics(metricOrders, amountRemitted),
    }
  })
}

export async function createDeliveryDriver(input: DeliveryDriverInput, organizationId: string): Promise<DeliveryDriver> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase.from('delivery_drivers').insert({
    organization_id: organizationId,
    name: input.name,
    phone: input.phone || null,
  }).select().single()
  if (error) throw new Error(error.message)
  return data as DeliveryDriver
}

export async function setDeliveryDriverActive(id: string, isActive: boolean, organizationId: string): Promise<DeliveryDriver | null> {
  const db = await createAdminClient()
  const { data, error } = await db.from('delivery_drivers').update({ is_active: isActive })
    .eq('id', id).eq('organization_id', organizationId).select().maybeSingle()
  if (error) throw new Error('Impossible de modifier le livreur.')
  return data as DeliveryDriver | null
}

export async function addDeliverySettlement(
  driverId: string,
  input: DeliverySettlementInput,
  organizationId: string,
  userId: string,
): Promise<void> {
  const supabase = await createAdminClient()
  const { data: driver } = await supabase.from('delivery_drivers').select('id')
    .eq('id', driverId).eq('organization_id', organizationId).single()
  if (!driver) throw new Error('Livreur introuvable')

  const [{ data: deliveredOrders, error: ordersError }, { data: settlements, error: settlementsError }] = await Promise.all([
    supabase.from('orders')
      .select('confirmation_amount, order_lines(line_total, unit_price, quantity)')
      .eq('organization_id', organizationId)
      .eq('delivery_driver_id', driverId)
      .eq('status', 'delivered'),
    supabase.from('delivery_settlements')
      .select('amount')
      .eq('organization_id', organizationId)
      .eq('delivery_driver_id', driverId),
  ])
  if (ordersError) throw new Error(ordersError.message)
  if (settlementsError) throw new Error(settlementsError.message)

  // The driver keeps delivery fees, so only parcels (minus deposits) are owed to the shop.
  const remittable = deliveredOrders?.reduce((total, order) => {
    const lines = (order.order_lines as unknown as { line_total?: number; unit_price?: number | null; quantity: number }[]) ?? []
    return total + orderRemittableAmount(lines, Number(order.confirmation_amount ?? 0))
  }, 0) ?? 0
  const alreadyRemitted = settlements?.reduce((total, settlement) => total + Number(settlement.amount), 0) ?? 0
  const amountDue = Math.max(0, remittable - alreadyRemitted)

  if (amountDue === 0) {
    throw new Error('Aucun montant à reverser. Une commande doit d’abord être marquée comme livrée.')
  }
  if (input.amount > amountDue) {
    throw new Error(`Le versement ne peut pas dépasser le solde dû de ${amountDue} FCFA.`)
  }

  const { error } = await supabase.from('delivery_settlements').insert({
    delivery_driver_id: driverId,
    organization_id: organizationId,
    amount: input.amount,
    settled_at: input.settled_at,
    note: input.note || null,
    created_by: userId,
  })
  if (error) throw new Error(error.message)
}
