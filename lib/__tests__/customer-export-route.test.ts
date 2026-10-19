import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/admin-context', () => ({ requireOrganizationAdmin: vi.fn() }))
vi.mock('@/services/customer-export-service', () => ({ getCustomerExport: vi.fn() }))
import { requireOrganizationAdmin } from '@/lib/admin-context'
import { getCustomerExport } from '@/services/customer-export-service'
import { GET } from '@/app/api/customers/export/route'

describe('GET /api/customers/export', () => {
  beforeEach(() => vi.resetAllMocks())
  it('refuse les visiteurs et employés avant toute lecture des clients', async () => {
    vi.mocked(requireOrganizationAdmin).mockResolvedValue(null)
    const response = await GET(new NextRequest('http://localhost/api/customers/export'))
    expect(response.status).toBe(403)
    expect(getCustomerExport).not.toHaveBeenCalled()
  })
  it('transmet exclusivement la boutique authentifiée et les filtres validés', async () => {
    vi.mocked(requireOrganizationAdmin).mockResolvedValue({ user: { id: 'admin' }, organizationId: 'own-org' } as Awaited<ReturnType<typeof requireOrganizationAdmin>>)
    vi.mocked(getCustomerExport).mockResolvedValue({ customers: [], matchedOrders: 0, excludedOrders: 0, duplicateOrders: 0 })
    const response = await GET(new NextRequest('http://localhost/api/customers/export?organizationId=other-org&status=all&from=2026-10-01'))
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(getCustomerExport).toHaveBeenCalledWith('own-org', { status: 'all', from: '2026-10-01' })
  })
  it('refuse un filtre invalide', async () => {
    vi.mocked(requireOrganizationAdmin).mockResolvedValue({ organizationId: 'own-org' } as Awaited<ReturnType<typeof requireOrganizationAdmin>>)
    expect((await GET(new NextRequest('http://localhost/api/customers/export?from=2026-02-30'))).status).toBe(400)
    expect(getCustomerExport).not.toHaveBeenCalled()
  })
})
