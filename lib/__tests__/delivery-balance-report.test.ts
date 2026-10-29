import { describe, expect, it } from 'vitest'
import { buildDeliveryDayReport, deliveryDaySchema, type DeliveryAssignmentRow } from '@/lib/delivery-balance'
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
