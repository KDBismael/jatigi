import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
vi.mock('@/lib/admin-context', () => ({ requireOrganizationAdmin: vi.fn() }))
vi.mock('@/services/supabase/server', () => ({ createAdminClient: vi.fn() }))
import { requireOrganizationAdmin } from '@/lib/admin-context'
import { createAdminClient } from '@/services/supabase/server'
import { setDeliveryDriverActive } from '@/services/delivery-driver-service'
import { PATCH } from '@/app/api/delivery-drivers/[id]/route'

const context = { params: Promise.resolve({ id: 'driver' }) }
function request(body: object) { return new NextRequest('http://localhost/api/delivery-drivers/driver', { method: 'PATCH', body: JSON.stringify(body) }) }
function database(data: unknown) {
  const query = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data, error: null }) }
  const from = vi.fn().mockReturnValue(query)
  vi.mocked(createAdminClient).mockResolvedValue({ from } as unknown as Awaited<ReturnType<typeof createAdminClient>>)
  return { query, from }
}
describe('archivage des livreurs', () => {
  beforeEach(() => vi.resetAllMocks())
  it('archive le livreur de sa boutique sans toucher aux commandes ni aux versements', async () => {
    const { query, from } = database({ id: 'driver', is_active: false })
    await setDeliveryDriverActive('driver', false, 'own-org')
    expect(from.mock.calls).toEqual([['delivery_drivers']])
    expect(query.update).toHaveBeenCalledWith({ is_active: false })
    expect(query.eq.mock.calls).toEqual([['id', 'driver'], ['organization_id', 'own-org']])
  })
  it('refuse les employés avant toute écriture', async () => {
    vi.mocked(requireOrganizationAdmin).mockResolvedValue(null)
    expect((await PATCH(request({ is_active: false }), context)).status).toBe(403)
    expect(createAdminClient).not.toHaveBeenCalled()
  })
  it('ne permet que le changement actif/archivé et ignore une boutique fournie par le client', async () => {
    vi.mocked(requireOrganizationAdmin).mockResolvedValue({ organizationId: 'own-org' } as Awaited<ReturnType<typeof requireOrganizationAdmin>>)
    const { query } = database({ id: 'driver', is_active: true })
    expect((await PATCH(request({ is_active: true, organization_id: 'other-org' }), context)).status).toBe(400)
    expect(query.update).not.toHaveBeenCalled()
    expect((await PATCH(request({ is_active: true }), context)).status).toBe(200)
    expect(query.eq).toHaveBeenCalledWith('organization_id', 'own-org')
  })
  it('renvoie 404 pour un livreur absent ou appartenant à une autre boutique', async () => {
    vi.mocked(requireOrganizationAdmin).mockResolvedValue({ organizationId: 'own-org' } as Awaited<ReturnType<typeof requireOrganizationAdmin>>)
    database(null)
    expect((await PATCH(request({ is_active: false }), context)).status).toBe(404)
  })
})
