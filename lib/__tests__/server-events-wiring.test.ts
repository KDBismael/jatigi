import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ record: vi.fn(), createOrder: vi.fn(), settle: vi.fn(), checkout: vi.fn() }))
vi.mock('@/services/analytics-events-service', () => ({ recordEvent: mocks.record }))
vi.mock('@/lib/order-context', () => ({ getOrderContext: async () => ({ user: { id: 'u' }, profile: { role: 'admin', organization_id: 'org' } }) }))
vi.mock('@/services/order-service', () => ({ createOrder: mocks.createOrder, getOrders: vi.fn() }))
vi.mock('@/services/delivery-driver-service', () => ({ addDeliverySettlement: mocks.settle, getDeliverySettlementHistory: vi.fn() }))
vi.mock('@/services/billing-service', () => ({ checkoutSubscription: mocks.checkout }))
vi.mock('@/services/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u' } } }) },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'manager', organization_id: 'org' } }) }) }) }),
  }),
}))
import { POST as createOrderRoute } from '@/app/api/orders/route'
import { POST as settleRoute } from '@/app/api/delivery-drivers/[id]/settlements/route'
import { POST as checkoutRoute } from '@/app/api/billing/checkout/route'

const post = (url: string, body: unknown) => new NextRequest(`http://localhost${url}`, { method: 'POST', body: JSON.stringify(body) })
const order = { client_name: 'Awa', channel: 'whatsapp', order_date: '2026-11-03', seller_id: '10000000-0000-4000-8000-000000000001', lines: [{ product_id: '10000000-0000-4000-8000-000000000002', quantity: 1 }] }
beforeEach(() => vi.clearAllMocks())

it('records an order only once it is saved', async () => {
  mocks.createOrder.mockResolvedValueOnce({ id: 'o', order_lines: [] })
  expect((await createOrderRoute(post('/api/orders', order))).status).toBe(201)
  expect(mocks.record).toHaveBeenCalledWith('order_created', { userId: 'u', organizationId: 'org' }, { channel: 'whatsapp', role: 'admin' })
  mocks.createOrder.mockRejectedValueOnce(new Error('STOCK_INSUFFICIENT'))
  await createOrderRoute(post('/api/orders', order))
  expect(mocks.record).toHaveBeenCalledTimes(1)
})

it('records a versement with the recorder role', async () => {
  mocks.settle.mockResolvedValueOnce(undefined)
  await settleRoute(post('/api/delivery-drivers/d/settlements', { amount: 1000, settled_at: '2026-11-03' }), { params: Promise.resolve({ id: 'd' }) })
  expect(mocks.record).toHaveBeenCalledWith('settlement_recorded', { userId: 'u', organizationId: 'org' }, { role: 'manager' })
})

it('records a started checkout with its plan and cycle, not a failed one', async () => {
  mocks.checkout.mockRejectedValueOnce(new Error('BILLING_UNAVAILABLE'))
  await checkoutRoute(post('/api/billing/checkout', { plan: 'pro', cycle: 'monthly' })).catch(() => null)
  expect(mocks.record).not.toHaveBeenCalled()
  mocks.checkout.mockResolvedValueOnce({ url: 'https://pay.test' })
  await checkoutRoute(post('/api/billing/checkout', { plan: 'pro', cycle: 'monthly' }))
  expect(mocks.record).toHaveBeenCalledWith('checkout_started', { userId: 'u', organizationId: 'org' }, { plan: 'pro', cycle: 'monthly' })
})
