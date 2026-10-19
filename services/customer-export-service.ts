import { createAdminClient } from '@/services/supabase/server'
import { buildCustomerExport, type CustomerExportFilters, type CustomerExportOrder } from '@/lib/customer-export'

export async function getCustomerExport(organizationId: string, filters: CustomerExportFilters) {
  const db = await createAdminClient()
  const orders: CustomerExportOrder[] = []
  // Page through the complete selection instead of relying on the Data API row limit.
  const pageSize = 500
  for (let offset = 0; ; offset += pageSize) {
    let query = db.from('orders').select(
      filters.productId
        ? 'id,client_name,client_phone,order_date,order_lines!inner(product_id,product:products(name))'
        : 'id,client_name,client_phone,order_date,order_lines(product_id,product:products(name))'
    ).eq('organization_id', organizationId).order('id').range(offset, offset + pageSize - 1)
    if (filters.status !== 'all') query = query.eq('status', filters.status)
    if (filters.productId) query = query.eq('order_lines.product_id', filters.productId)
    if (filters.from) query = query.gte('order_date', filters.from)
    if (filters.to) query = query.lte('order_date', filters.to)
    const { data, error } = await query
    if (error) throw new Error('Impossible de charger les clients')
    const page = (data ?? []) as unknown as CustomerExportOrder[]
    orders.push(...page)
    if (page.length < pageSize) break
  }
  return buildCustomerExport(orders)
}
