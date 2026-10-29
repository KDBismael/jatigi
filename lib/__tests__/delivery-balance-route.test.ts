import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
vi.mock('@/services/billing-service', () => ({ requireFeature: vi.fn() }))
vi.mock('@/lib/order-context', () => ({ getOrderContext: vi.fn() }))
vi.mock('@/services/delivery-balance-service', () => ({ getDeliveryDayReport: vi.fn() }))
import { getOrderContext } from '@/lib/order-context'
import { getDeliveryDayReport } from '@/services/delivery-balance-service'
import { requireFeature } from '@/services/billing-service'
import { BillingAccessError } from '@/lib/billing/access'
import { GET } from '@/app/api/delivery-balance/route'
function auth(role: string) { vi.mocked(getOrderContext).mockResolvedValue({ user: { id: 'user' }, profile: { role, organization_id: 'own-org' } } as Awaited<ReturnType<typeof getOrderContext>>) }
describe('API bilan journalier', () => {
  beforeEach(() => vi.resetAllMocks())
  it('refuse visiteurs et employés avant toute lecture financière', async () => {
    expect((await GET(new NextRequest('http://localhost/api/delivery-balance?date=2026-10-29'))).status).toBe(401)
    auth('employee')
    expect((await GET(new NextRequest('http://localhost/api/delivery-balance?date=2026-10-29'))).status).toBe(403)
    expect(getDeliveryDayReport).not.toHaveBeenCalled()
  })
  it.each(['manager','admin'])('permet le rôle %s, utilise seulement la boutique authentifiée et évite le cache', async role => {
    auth(role)
    vi.mocked(getDeliveryDayReport).mockResolvedValue({ date: '2026-10-29', drivers: [], undatedOrders: 0 })
    const response = await GET(new NextRequest('http://localhost/api/delivery-balance?date=2026-10-29&organization_id=other-org'))
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(getDeliveryDayReport).toHaveBeenCalledWith('own-org','2026-10-29')
  })
  it('refuse le plan gratuit avant les données financières', async () => {
    auth('admin')
    vi.mocked(requireFeature).mockRejectedValueOnce(new BillingAccessError('FEATURE_UPGRADE_REQUIRED','Passez au plan Pro'))
    expect((await GET(new NextRequest('http://localhost/api/delivery-balance?date=2026-10-29'))).status).toBe(402)
    expect(getDeliveryDayReport).not.toHaveBeenCalled()
  })
  it('refuse les dates invalides et les résultats partiels', async () => {
    auth('manager')
    expect((await GET(new NextRequest('http://localhost/api/delivery-balance?date=2026-02-30'))).status).toBe(400)
    vi.mocked(getDeliveryDayReport).mockRejectedValue(new Error('database failure'))
    expect((await GET(new NextRequest('http://localhost/api/delivery-balance?date=2026-10-29'))).status).toBe(500)
  })
})
