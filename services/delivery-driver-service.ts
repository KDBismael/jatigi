import { createAdminClient } from '@/services/supabase/server'
import type { DeliveryDriverInput, DeliverySettlementInput } from '@/lib/schemas/delivery-driver.schema'
import type { DeliveryDriver, DeliveryDriverSummary } from '@/types/delivery-driver'
import { calculateDeliveryMetrics } from '@/lib/delivery-metrics'

export async function getDeliveryDrivers(organizationId: string): Promise<DeliveryDriverSummary[]> {
  const supabase = await createAdminClient()
  const [{ data: drivers, error: driversError }, { data: orders, error: ordersError }, { data: settlements, error: settlementsError }] = await Promise.all([
    supabase.from('delivery_drivers').select('*').eq('organization_id', organizationId).order('name'),
    supabase.from('orders').select('delivery_driver_id, status, order_lines(unit_price, quantity)').eq('organization_id', organizationId).not('delivery_driver_id', 'is', null),
    supabase.from('delivery_settlements').select('delivery_driver_id, amount').eq('organization_id', organizationId),
  ])
  if (driversError) throw new Error(driversError.message)
  if (ordersError) throw new Error(ordersError.message)
  if (settlementsError) throw new Error(settlementsError.message)

  return (drivers as DeliveryDriver[]).map((driver) => {
    const assigned = orders?.filter((order) => order.delivery_driver_id === driver.id) ?? []
    const metricOrders = assigned.map((order) => {
      const lines = (order.order_lines as unknown as { unit_price: number; quantity: number }[]) ?? []
      return { status: order.status, amount: lines.reduce((sum, line) => sum + line.unit_price * line.quantity, 0) }
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
      .select('order_lines(unit_price, quantity)')
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

  const collected = deliveredOrders?.reduce((orderTotal, order) => {
    const lines = (order.order_lines as unknown as { unit_price: number; quantity: number }[]) ?? []
    return orderTotal + lines.reduce((lineTotal, line) => lineTotal + Number(line.unit_price) * line.quantity, 0)
  }, 0) ?? 0
  const alreadyRemitted = settlements?.reduce((total, settlement) => total + Number(settlement.amount), 0) ?? 0
  const amountDue = Math.max(0, collected - alreadyRemitted)

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
