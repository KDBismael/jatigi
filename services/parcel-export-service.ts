import { createAdminClient } from '@/services/supabase/server'
import { buildParcelExport, type ParcelExportFilters, type ParcelExportOrder } from '@/lib/parcel-export'

export async function getParcelExport(organizationId: string, filters: ParcelExportFilters) {
  const db = await createAdminClient()
  const orders: ParcelExportOrder[] = []
  const pageSize = 500
  for (let offset = 0; ; offset += pageSize) {
    let query = db.from('orders').select(
      'id,order_date,client_name,client_phone,channel,status,delivery_location,delivery_fee,confirmation_amount,delivery_driver:delivery_drivers(name),order_lines(quantity,unit_price,line_total,discount_amount,product:products(name))'
    ).eq('organization_id', organizationId).order('id').range(offset, offset + pageSize - 1)
    if (filters.status === 'delivered') query = query.eq('status', 'delivered')
    if (filters.status === 'not_delivered') query = query.neq('status', 'delivered')
    if (filters.from) query = query.gte('order_date', filters.from)
    if (filters.to) query = query.lte('order_date', filters.to)
    const { data, error } = await query
    if (error) throw new Error('Impossible de charger les colis')
    const page = (data ?? []) as unknown as ParcelExportOrder[]
    orders.push(...page)
    if (page.length < pageSize) break
  }
  return buildParcelExport(orders)
}
