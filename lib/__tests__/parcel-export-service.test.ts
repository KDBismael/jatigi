import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/services/supabase/server', () => ({ createAdminClient: vi.fn() }))
import { createAdminClient } from '@/services/supabase/server'
import { getParcelExport } from '@/services/parcel-export-service'

function mockDatabase(pages: { data: unknown; error: unknown }[]) {
  const nextPage = vi.fn()
  for (const page of pages) nextPage.mockResolvedValueOnce(page)
  const query = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), neq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(), range: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(), lte: vi.fn().mockReturnThis(),
    then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) => nextPage().then(resolve, reject),
  }
  vi.mocked(createAdminClient).mockResolvedValue({ from: vi.fn().mockReturnValue(query) } as unknown as Awaited<ReturnType<typeof createAdminClient>>)
  return query
}

describe('lecture des colis à exporter', () => {
  beforeEach(() => vi.resetAllMocks())
  it('filtre la boutique, les non livrés et la période sans lire les coûts', async () => {
    const query = mockDatabase([{ data: [], error: null }])
    await getParcelExport('own-org', { status: 'not_delivered', from: '2026-10-01', to: '2026-10-21' })
    expect(query.eq).toHaveBeenCalledWith('organization_id', 'own-org')
    expect(query.neq).toHaveBeenCalledWith('status', 'delivered')
    expect(query.gte).toHaveBeenCalledWith('order_date', '2026-10-01')
    expect(query.lte).toHaveBeenCalledWith('order_date', '2026-10-21')
    expect(query.select.mock.calls[0][0]).not.toMatch(/\*|cost/)
  })
  it('charge toutes les pages et conserve chaque colis sans regrouper les clients', async () => {
    const order = { id: 'id', client_name: 'Awa', client_phone: null, channel: 'facebook', order_date: '2026-10-21', status: 'delivered', order_lines: [] }
    const query = mockDatabase([
      { data: Array.from({ length: 500 }, (_, index) => ({ ...order, id: String(index) })), error: null },
      { data: [{ ...order, id: 'last' }], error: null },
    ])
    const report = await getParcelExport('own-org', { status: 'delivered' })
    expect(query.range.mock.calls).toEqual([[0, 499], [500, 999]])
    expect(query.eq.mock.calls).toEqual([
      ['organization_id', 'own-org'], ['status', 'delivered'],
      ['organization_id', 'own-org'], ['status', 'delivered'],
    ])
    expect(report.delivered).toHaveLength(501)
  })
  it('refuse un export partiel si une page suivante échoue', async () => {
    mockDatabase([{ data: Array(500).fill({ status: 'delivered', order_lines: [] }), error: null },
      { data: null, error: { message: 'failure' } }])
    await expect(getParcelExport('own-org', { status: 'all' })).rejects.toThrow('Impossible de charger les colis')
  })
})
