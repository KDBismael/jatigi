import { describe, expect, it } from 'vitest'
import { applyDeliveryDayPayments, buildDeliveryDayReport, deliveryDaySchema, type DeliveryAssignmentRow } from '@/lib/delivery-balance'
const base: DeliveryAssignmentRow = { id: 'a', order_id: 'old-order', driver_id: 'driver', status: 'delivered', remittable_amount: 13000,
  driver: { name: 'Ali', is_active: true }, order: { client_name: 'Awa', client_phone: '0701020304', order_lines: [{ quantity: 3, product: { name: 'Parfum' } }] } }
describe('bilan des colis confiés pour une journée', () => {
  it('compte les statuts mais ne somme que les montants nets livrés, pas les autres jours ni les versements globaux', () => {
    const report = buildDeliveryDayReport('2026-10-29', [base, { ...base, id: 'b', status: 'postponed' }, { ...base, id: 'c', status: 'cancelled' }, { ...base, id: 'd', status: 'in_progress' }], 2)
    expect(report).toMatchObject({ date: '2026-10-29', undatedOrders: 2, drivers: [{ counts: { delivered: 1, postponed: 1, cancelled: 1, in_progress: 1 }, expectedRemittance: 13000 }] })
    expect(report.drivers[0].orders[0]).toMatchObject({ clientName: 'Awa', products: 'Parfum × 3', remittableAmount: 13000 })
  })
  it('conserve les livreurs archivés et les clients sans téléphone', () => {
    const report = buildDeliveryDayReport('2026-10-29', [{ ...base, driver: { name: 'Ancien', is_active: false }, order: { ...base.order!, client_phone: null } }], 0)
    expect(report.drivers[0]).toMatchObject({ driverName: 'Ancien', isActive: false, expectedRemittance: 13000 })
    expect(report.drivers[0].orders[0].clientPhone).toBeNull()
  })
  it('refuse une date impossible', () => {
    expect(deliveryDaySchema.safeParse({ date: '2026-02-30' }).success).toBe(false)
  })
})

it('keeps daily receipts separate from global debt and dated payments',()=>{
 const report=buildDeliveryDayReport('2026-10-29',[{...base,collected_amount:13500}],0)
 expect(report.drivers[0]).toMatchObject({amountCollected:13500,deliveryFees:500,expectedRemittance:13000})
})
it('reports dated remittances without subtracting them from tour expectations',()=>{
 const report=buildDeliveryDayReport('2026-10-29',[base],0)
 const enriched=applyDeliveryDayPayments(report,[{delivery_driver_id:'driver',amount:9000}], [{id:'driver',amount_due:25000}] as never)
 expect(enriched.drivers[0]).toMatchObject({expectedRemittance:13000,remittedOnDate:9000,globalAmountDue:25000})
})
