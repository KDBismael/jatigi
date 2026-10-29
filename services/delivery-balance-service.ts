import { createAdminClient } from '@/services/supabase/server'
import { buildDeliveryDayReport, type DeliveryAssignmentRow } from '@/lib/delivery-balance'
export async function getDeliveryDayReport(organizationId: string, date: string) {
  const db = await createAdminClient()
  const rows: DeliveryAssignmentRow[] = []
  for (let offset=0; ; offset+=500) {
    const { data, error } = await db.from('order_delivery_assignments')
      .select('id,order_id,driver_id,status,remittable_amount,driver:delivery_drivers(name,is_active),order:orders(client_name,client_phone,order_lines(quantity,product:products(name)))')
      .eq('organization_id',organizationId).eq('assignment_date',date).order('id').range(offset,offset+499)
    if (error) throw new Error('Impossible de charger le bilan')
    const page = (data ?? []) as unknown as DeliveryAssignmentRow[]
    rows.push(...page)
    if (page.length<500) break
  }
  const { count, error } = await db.from('orders').select('id',{count:'exact',head:true})
    .eq('organization_id',organizationId).not('delivery_driver_id','is',null).is('delivery_date',null).not('status','in','(delivered,cancelled)')
  if (error) throw new Error('Impossible de charger le bilan')
  return buildDeliveryDayReport(date,rows,count ?? 0)
}
