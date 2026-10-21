import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/admin-context', () => ({ requireOrganizationAdmin: vi.fn() }))
vi.mock('@/services/parcel-export-service', () => ({ getParcelExport: vi.fn() }))
import { requireOrganizationAdmin } from '@/lib/admin-context'
import { getParcelExport } from '@/services/parcel-export-service'
import { GET } from '@/app/api/orders/export/route'

describe('GET /api/orders/export', () => {
  beforeEach(() => vi.resetAllMocks())
  it('refuse les visiteurs et employés avant toute lecture des clients', async () => {
    vi.mocked(requireOrganizationAdmin).mockResolvedValue(null)
    const response = await GET(new NextRequest('http://localhost/api/orders/export'))
    expect(response.status).toBe(403)
    expect(getParcelExport).not.toHaveBeenCalled()
  })
  it('transmet exclusivement la boutique authentifiée et les filtres validés', async () => {
    vi.mocked(requireOrganizationAdmin).mockResolvedValue({ user: { id: 'admin' }, organizationId: 'own-org' } as Awaited<ReturnType<typeof requireOrganizationAdmin>>)
    vi.mocked(getParcelExport).mockResolvedValue({ delivered: [], notDelivered: [] })
    const response = await GET(new NextRequest('http://localhost/api/orders/export?organizationId=other-org&status=all&from=2026-10-01'))
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(getParcelExport).toHaveBeenCalledWith('own-org', { status: 'all', from: '2026-10-01' })
  })
  it('refuse un filtre invalide', async () => {
    vi.mocked(requireOrganizationAdmin).mockResolvedValue({ organizationId: 'own-org' } as Awaited<ReturnType<typeof requireOrganizationAdmin>>)
    expect((await GET(new NextRequest('http://localhost/api/orders/export?from=2026-02-30'))).status).toBe(400)
    expect(getParcelExport).not.toHaveBeenCalled()
  })
})
