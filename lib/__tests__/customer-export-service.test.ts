import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/services/supabase/server', () => ({ createAdminClient: vi.fn() }))
import { createAdminClient } from '@/services/supabase/server'
import { getCustomerExport } from '@/services/customer-export-service'

function mockDatabase(pages: { data: unknown; error: unknown }[]) {
  const nextPage = vi.fn()
  for (const page of pages) nextPage.mockResolvedValueOnce(page)
  const query = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(), range: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(), lte: vi.fn().mockReturnThis(),
    then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) => nextPage().then(resolve, reject),
  }
  vi.mocked(createAdminClient).mockResolvedValue({ from: vi.fn().mockReturnValue(query) } as unknown as Awaited<ReturnType<typeof createAdminClient>>)
  return query
}

describe('lecture des clients à exporter', () => {
  beforeEach(() => vi.resetAllMocks())
  it('filtre la boutique, le produit, le statut et les bornes inclusives', async () => {
    const query = mockDatabase([{ data: [], error: null }])
    await getCustomerExport('own-org', { productId: 'product-id', status: 'delivered', channel: 'facebook', from: '2026-10-01', to: '2026-10-19' })
    expect(query.select).toHaveBeenCalledWith(expect.stringContaining('order_lines!inner'))
    expect(query.eq).toHaveBeenCalledWith('organization_id', 'own-org')
    expect(query.eq).toHaveBeenCalledWith('order_lines.product_id', 'product-id')
    expect(query.eq).toHaveBeenCalledWith('status', 'delivered')
    expect(query.eq).toHaveBeenCalledWith('channel', 'facebook')
    expect(query.select).toHaveBeenCalledWith(expect.stringContaining('channel'))
    expect(query.gte).toHaveBeenCalledWith('order_date', '2026-10-01')
    expect(query.lte).toHaveBeenCalledWith('order_date', '2026-10-19')
  })
  it('charge les pages suivantes et regroupe les doublons entre pages', async () => {
    const order = { id: 'id', client_name: 'Awa', client_phone: '0701020304', channel: 'facebook', order_date: '2026-10-19', order_lines: [] }
    const query = mockDatabase([
      { data: Array.from({ length: 500 }, (_, index) => ({ ...order, id: String(index) })), error: null },
      { data: [{ ...order, id: 'last' }], error: null },
    ])
    const report = await getCustomerExport('own-org', { status: 'all' })
    expect(query.range.mock.calls).toEqual([[0, 499], [500, 999]])
    expect(query.eq.mock.calls).toEqual([['organization_id', 'own-org'], ['organization_id', 'own-org']])
    expect(report.matchedOrders).toBe(501)
    expect(report.customers).toHaveLength(1)
    expect(report.customers[0].orderCount).toBe(501)
  })
  it('ne renvoie pas un export partiel si une page échoue', async () => {
    mockDatabase([{ data: null, error: { message: 'database failure' } }])
    await expect(getCustomerExport('own-org', { status: 'all' })).rejects.toThrow('Impossible de charger les clients')
  })
})
