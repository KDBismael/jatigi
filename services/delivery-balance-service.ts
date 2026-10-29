import { createAdminClient } from '@/services/supabase/server'
import {getDeliveryDrivers} from '@/services/delivery-driver-service'
import { applyDeliveryDayPayments, buildDeliveryDayReport, type DeliveryAssignmentRow } from '@/lib/delivery-balance'
export async function getDeliveryDayReport(organizationId: string, date: string) {
  const db = await createAdminClient()
  const rows: DeliveryAssignmentRow[] = []
  for (let offset=0; ; offset+=500) {
    const { data, error } = await db.from('order_delivery_assignments')
      .select('id,order_id,driver_id,status,remittable_amount,collected_amount,driver:delivery_drivers(name,is_active),order:orders(client_name,client_phone,order_lines(quantity,product:products(name)))')
      .eq('organization_id',organizationId).eq('assignment_date',date).order('id').range(offset,offset+499)
    if (error) throw new Error('Impossible de charger le bilan')
    const page = (data ?? []) as unknown as DeliveryAssignmentRow[]
    rows.push(...page)
    if (page.length<500) break
  }
  const { count, error } = await db.from('orders').select('id',{count:'exact',head:true})
    .eq('organization_id',organizationId).not('delivery_driver_id','is',null).is('delivery_date',null).not('status','in','(delivered,cancelled,returned)')
  if (error) throw new Error('Impossible de charger le bilan')
  const payments: {delivery_driver_id:string;amount:number}[]=[]
  for(let offset=0;;offset+=500){
    const {data,error}=await db.from('delivery_settlements').select('delivery_driver_id,amount').eq('organization_id',organizationId).eq('settled_at',date).order('id').range(offset,offset+499)
    if(error)throw new Error('Impossible de charger le bilan')
    const page=data??[];payments.push(...page);if(page.length<500)break
  }
  return applyDeliveryDayPayments(buildDeliveryDayReport(date,rows,count ?? 0),payments,await getDeliveryDrivers(organizationId))
}
