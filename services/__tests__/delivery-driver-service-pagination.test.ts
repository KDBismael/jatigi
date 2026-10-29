import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addDeliverySettlement, getDeliveryDrivers } from '@/services/delivery-driver-service'

const { createAdminClient } = vi.hoisted(() => ({ createAdminClient: vi.fn() }))
vi.mock('@/services/supabase/server', () => ({ createAdminClient }))

const driver = { id: 'driver', organization_id: 'shop', name: 'Koffi', phone: null, is_active: true, created_at: '', updated_at: '' }
const orders = Array.from({ length: 1201 }, (_, index) => ({
  id: `order-${index}`, organization_id: 'shop', delivery_driver_id: 'driver', status: 'delivered',
  confirmation_amount: 200, delivery_fee: 100,
  order_lines: [{ line_total: 1000, unit_price: 1000, quantity: 1 }],
}))
const settlements = Array.from({ length: 1201 }, (_, index) => ({
  id: `settlement-${index}`, organization_id: 'shop', delivery_driver_id: 'driver', amount: 300,
}))
type PageRequest = { table: string; from: number; to: number; filters: unknown[][]; ordering: string[] }

function serveFinancialHistory(failingTable?: string) {
  const requests: PageRequest[] = []
  const writes: unknown[] = []
  createAdminClient.mockResolvedValue({
    from: (table: string) => {
      const filters: unknown[][] = []
      const ordering: string[] = []
      const rows = table === 'orders' ? orders : table === 'delivery_settlements' ? settlements : [driver]
      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => { filters.push(['eq', column, value]); return query },
        not: (column: string, operator: string, value: unknown) => { filters.push(['not', column, operator, value]); return query },
        order: (column: string) => { ordering.push(column); return query },
        single: async () => ({ data: driver, error: null }),
        insert: async (payload: unknown) => { writes.push(payload); return { error: null } },
        range: async (from: number, to: number) => {
          requests.push({ table, from, to, filters: [...filters], ordering: [...ordering] })
          return table === failingTable && from > 0
            ? { data: null, error: { message: `${table} page unavailable` } }
            : { data: rows.slice(from, to + 1), error: null }
        },
        then: (resolve: (result: unknown) => unknown) => Promise.resolve(resolve({ data: rows.slice(0, 1000), error: null })),
      }
      return query
    },
  })
  return { requests, writes }
}

beforeEach(() => vi.clearAllMocks())

function expectFinancialPages(requests: PageRequest[], forSettlement: boolean) {
  for (const table of ['orders', 'delivery_settlements']) {
    const pages = requests.filter((request) => request.table === table)
    expect(pages.map(({ from, to }) => [from, to])).toEqual([[0, 499], [500, 999], [1000, 1499]])
    for (const page of pages) {
      expect(page.ordering).toContain('id')
      expect(page.filters).toEqual([
        ['eq', 'organization_id', 'shop'],
        ...(forSettlement ? [['eq', 'delivery_driver_id', 'driver']] : table === 'orders' ? [['not', 'delivery_driver_id', 'is', null]] : []),
        ...(forSettlement && table === 'orders' ? [['eq', 'status', 'delivered']] : []),
      ])
    }
  }
}

describe('complete delivery financial history', () => {
  it('calculates the full balance beyond 1000 orders and settlements while keeping fees separate', async () => {
    const { requests } = serveFinancialHistory()
    const result = await getDeliveryDrivers('shop')
    expect(result).toEqual([expect.objectContaining({
      id: 'driver', packages_delivered: 1201, amount_collected: 1_080_900,
      amount_delivery_fees: 120_100, amount_remitted: 360_300, amount_due: 600_500,
    })])
    expectFinancialPages(requests, false)
  })

  it('accepts the exact full outstanding balance after reading all historical pages', async () => {
    const { requests, writes } = serveFinancialHistory()
    await addDeliverySettlement('driver', { amount: 600_500, settled_at: '2026-10-29' }, 'shop', 'user')
    expect(writes).toEqual([{
      delivery_driver_id: 'driver', organization_id: 'shop', amount: 600_500,
      settled_at: '2026-10-29', note: null, created_by: 'user',
    }])
    expectFinancialPages(requests, true)
  })

  it('rejects a settlement above the complete balance', async () => {
    const { writes } = serveFinancialHistory()
    await expect(addDeliverySettlement('driver', { amount: 600_501, settled_at: '2026-10-29' }, 'shop', 'user'))
      .rejects.toThrow('Le versement ne peut pas dépasser le solde dû de 600500 FCFA.')
    expect(writes).toEqual([])
  })

  it.each(['orders', 'delivery_settlements'])('never displays a partial balance after a later %s page fails', async (table) => {
    serveFinancialHistory(table)
    await expect(getDeliveryDrivers('shop')).rejects.toThrow(`${table} page unavailable`)
  })

  it.each(['orders', 'delivery_settlements'])('never inserts a settlement after a later %s page fails', async (table) => {
    const { writes } = serveFinancialHistory(table)
    await expect(addDeliverySettlement('driver', { amount: 10, settled_at: '2026-10-29' }, 'shop', 'user'))
      .rejects.toThrow(`${table} page unavailable`)
    expect(writes).toEqual([])
  })
})
