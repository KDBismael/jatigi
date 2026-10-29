import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getOrders } from '@/services/order-service'

const { createAdminClient } = vi.hoisted(() => ({ createAdminClient: vi.fn() }))
vi.mock('@/services/supabase/server', () => ({ createAdminClient, createClient: vi.fn() }))

const rows = Array.from({ length: 1201 }, (_, index) => ({
  id: `order-${String(index).padStart(4, '0')}`,
  created_at: '2026-10-01T12:00:00Z',
  organization_id: 'shop',
  client_name: 'Awa',
  client_phone: '0712345678',
  seller: { id: 'seller', full_name: 'Vendeur' },
  live_session: null,
  delivery_driver: null,
  order_lines: [{ id: 'line', product: { name: 'Article' } }],
}))

function serveOrders(failAfterFirstPage = false) {
  const requests: { from: number; to: number; orders: string[]; organization: string }[] = []
  createAdminClient.mockResolvedValue({
    from: () => {
      const ordering: string[] = []
      let organization = ''
      const query = {
        select: () => query,
        eq: (_column: string, value: string) => { organization = value; return query },
        order: (column: string, options: { ascending: boolean }) => {
          ordering.push(`${column}:${options.ascending}`)
          return query
        },
        range: async (from: number, to: number) => {
          requests.push({ from, to, orders: [...ordering], organization })
          return failAfterFirstPage && from > 0
            ? { data: null, error: { message: 'Page unavailable' } }
            : { data: rows.slice(from, to + 1), error: null }
        },
        // Supabase's default maximum simulates the old unpaginated request.
        then: (resolve: (result: unknown) => unknown) => Promise.resolve(resolve({ data: rows.slice(0, 1000), error: null })),
      }
      return query
    },
  })
  return requests
}

beforeEach(() => vi.clearAllMocks())

describe('getOrders pagination', () => {
  it('returns orders beyond the API cap with joined data and stable organization-scoped pages', async () => {
    const requests = serveOrders()
    const result = await getOrders('shop')
    expect(result).toEqual(rows)
    expect(requests).toEqual([
      { from: 0, to: 499, orders: ['created_at:false', 'id:false'], organization: 'shop' },
      { from: 500, to: 999, orders: ['created_at:false', 'id:false'], organization: 'shop' },
      { from: 1000, to: 1499, orders: ['created_at:false', 'id:false'], organization: 'shop' },
    ])
  })

  it('throws instead of returning incomplete orders when a later page fails', async () => {
    serveOrders(true)
    await expect(getOrders('shop')).rejects.toThrow('Page unavailable')
  })
})
