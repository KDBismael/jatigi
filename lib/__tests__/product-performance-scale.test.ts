import { expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ admin: vi.fn() }))
vi.mock('@/services/supabase/server', () => ({ createAdminClient: mocks.admin, createClient: mocks.admin }))
import { getProductPerformance } from '@/services/analytics-service'

it('ranks products over hundreds of delivered orders without sending order ids in the URL', async () => {
  const calls: [string, string, unknown[]][] = []
  const line = (i: number) => ({ product_id: i % 2 ? 'a' : 'b', quantity: 1, line_total: 1000, total_cost: 400, unit_price: 1000, unit_cost: 400, product: { name: i % 2 ? 'Parfum' : 'Sac' } })
  mocks.admin.mockResolvedValue({
    from: (table: string) => {
      let page: [number, number] | null = null
      const builder: Record<string, unknown> = {}
      for (const name of ['select', 'eq', 'in', 'gte', 'lte', 'order', 'range'])
        builder[name] = (...args: unknown[]) => { calls.push([table, name, args]); if (name === 'range') page = args as [number, number]; return builder }
      builder.then = (ok: (value: unknown) => unknown) => {
        if (table === 'orders') return Promise.resolve({ data: Array.from({ length: 300 }, (_, i) => ({ id: `o-${i}` })), error: null }).then(ok)
        const [from, to] = page ?? [0, 999]
        const total = 1500
        const rows = Array.from({ length: Math.max(0, Math.min(to, total - 1) - from + 1) }, (_, i) => line(from + i))
        return Promise.resolve({ data: rows, error: null }).then(ok)
      }
      return builder
    },
  })
  const ranking = await getProductPerformance({ dateFrom: '2026-10-01', dateTo: '2026-10-31' } as never, 'org-a')
  expect(calls.some(([, name]) => name === 'in')).toBe(false)
  expect(ranking.reduce((sum, p) => sum + p.total_quantity, 0)).toBe(1500)
  expect(calls).toContainEqual(['order_lines', 'eq', ['order.organization_id', 'org-a']])
  expect(calls).toContainEqual(['order_lines', 'eq', ['order.status', 'delivered']])
})
