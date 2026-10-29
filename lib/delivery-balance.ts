import { z } from 'zod'
import type { DeliveryDayReport, DeliveryDayStatus } from '@/types/delivery-balance'
export const deliveryDaySchema = z.object({ date: z.iso.date() })
export interface DeliveryAssignmentRow {
  id: string
  order_id: string
  driver_id: string
  status: DeliveryDayStatus
  collected_amount?: number | string | null
  remittable_amount: number | string
  driver: { name: string; is_active: boolean } | null
  order: { client_name: string; client_phone: string | null; order_lines: { quantity: number; product: { name: string } | null }[] } | null
}
export function buildDeliveryDayReport(date: string, rows: DeliveryAssignmentRow[], undatedOrders: number): DeliveryDayReport {
  const drivers = new Map<string, DeliveryDayReport['drivers'][number]>()
  for (const row of rows) {
    let driver = drivers.get(row.driver_id)
    if (!driver) {
      driver = { driverId: row.driver_id, driverName: row.driver?.name ?? 'Livreur', isActive: row.driver?.is_active ?? false,
        counts: { delivered: 0, in_progress: 0, cancelled: 0, postponed: 0 }, expectedRemittance: 0, amountCollected: 0, deliveryFees: 0, orders: [] }
      drivers.set(row.driver_id, driver)
    }
    const amount = Number(row.remittable_amount)
    driver.counts[row.status]++
    if (row.status === 'delivered') {
      driver.expectedRemittance = Math.round((driver.expectedRemittance + amount) * 100) / 100
      if(row.collected_amount==null){driver.amountCollected=null;driver.deliveryFees=null}
      else if(driver.amountCollected!=null&&driver.deliveryFees!=null){driver.amountCollected+=Number(row.collected_amount);driver.deliveryFees+=Math.max(0,Number(row.collected_amount)-amount)}
    }
    driver.orders.push({ assignmentId: row.id, orderId: row.order_id, clientName: row.order?.client_name ?? 'Commande',
      clientPhone: row.order?.client_phone ?? null, products: (row.order?.order_lines ?? []).map(line => `${line.product?.name ?? 'Produit'} × ${line.quantity}`).join('; '),
      status: row.status, remittableAmount: amount })
  }
  return { date, drivers: [...drivers.values()].sort((a,b) => a.driverName.localeCompare(b.driverName,'fr')), undatedOrders }
}

export function applyDeliveryDayPayments(report: DeliveryDayReport, payments: {delivery_driver_id:string;amount:number|string}[], balances: import('@/types/delivery-driver').DeliveryDriverSummary[]): DeliveryDayReport {
 const drivers=[...report.drivers]
 for(const payment of payments){
  if(!drivers.some(d=>d.driverId===payment.delivery_driver_id)){
   const driver=balances.find(d=>d.id===payment.delivery_driver_id)
   drivers.push({driverId:payment.delivery_driver_id,driverName:driver?.name??'Livreur',isActive:driver?.is_active??false,counts:{delivered:0,in_progress:0,postponed:0,cancelled:0},expectedRemittance:0,amountCollected:0,deliveryFees:0,orders:[]})
  }
 }
 return {...report,drivers:drivers.map(driver=>({...driver,
  remittedOnDate:payments.filter(p=>p.delivery_driver_id===driver.driverId).reduce((sum,p)=>sum+Number(p.amount),0),
  globalAmountDue:balances.find(d=>d.id===driver.driverId)?.amount_due??0,
 })).sort((a,b)=>a.driverName.localeCompare(b.driverName,'fr'))}
}
