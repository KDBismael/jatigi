import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ orders: [] as Record<string, unknown>[], updateOrderStatus: vi.fn() }))
vi.mock('@/lib/order-context', () => ({ getOrderContext: async () => ({ user: { id: 'u' }, profile: { role: 'manager', organization_id: 'org' } }) }))
vi.mock('@/services/order-service', () => ({
  getOrders: async () => mocks.orders,
  getOrderById: async (id: string) => mocks.orders.find(o => o.id === id) ?? null,
  updateOrderStatus: mocks.updateOrderStatus,
  createOrder: vi.fn(), updateOrder: vi.fn(),
}))
import { isDeliveryOrder, managerStatusOptions } from '@/lib/order-access'
import { GET as listOrders } from '@/app/api/orders/route'
import { PATCH as changeStatus } from '@/app/api/orders/[id]/route'

const order = (id: string, status: string, driver: string | null) => ({ id, status, delivery_driver_id: driver, order_lines: [] })
beforeEach(() => {
  mocks.orders = [order('confirmed-driver', 'confirmed', 'd'), order('confirmed-alone', 'confirmed', null), order('received-driver', 'received', 'd'), order('delivered-driver', 'delivered', 'd')]
  mocks.updateOrderStatus.mockReset().mockImplementation(async (id: string, input: { status: string }) => ({ ...order(id, input.status, 'd') }))
})

it('treats confirmed orders handed to a driver as delivery work', () => {
  expect(isDeliveryOrder({ status: 'confirmed', delivery_driver_id: 'd' })).toBe(true)
  expect(isDeliveryOrder({ status: 'confirmed', delivery_driver_id: null })).toBe(false)
  expect(isDeliveryOrder({ status: 'received', delivery_driver_id: 'd' })).toBe(false)
})

it('lists confirmed + driver orders for a delivery manager', async () => {
  const ids = (await (await listOrders()).json()).map((o: { id: string }) => o.id)
  expect(ids).toEqual(['confirmed-driver', 'delivered-driver'])
})

it('lets a manager deliver a confirmed order but never send it back to confirmed', async () => {
  const patch = (id: string, status: string) => changeStatus(
    new NextRequest(`http://localhost/api/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    { params: Promise.resolve({ id }) },
  )
  expect((await patch('confirmed-driver', 'delivered')).status).toBe(200)
  expect((await patch('delivered-driver', 'confirmed')).status).toBe(403)
  expect((await patch('received-driver', 'delivered')).status).toBe(403)
})

it('shows the current status in the manager menu without offering earlier ones', () => {
  expect(managerStatusOptions('confirmed')).toEqual(['confirmed', 'in_progress', 'delivered', 'cancelled', 'postponed', 'returned'])
  expect(managerStatusOptions('delivered')).toEqual(['in_progress', 'delivered', 'cancelled', 'postponed', 'returned'])
})
