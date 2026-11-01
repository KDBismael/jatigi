import { beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ admin: vi.fn() }))
vi.mock('@/services/supabase/server', () => ({ createAdminClient: mocks.admin, createClient: mocks.admin }))
import { deleteProduct } from '@/services/product-service'

type Query = { table: string; calls: [string, unknown[]][] }

/** Chainable PostgREST stand-in: answers by table and operation, records every call. */
function setup(history: { lines: number; movements: number }) {
  const queries: Query[] = []
  const resolve = (q: Query) => {
    const ops = q.calls.map(([name]) => name)
    const headCount = q.calls.some(([name, args]) => name === 'select' && (args[1] as { head?: boolean } | undefined)?.head)
    if (q.table === 'order_lines') return headCount
      ? { data: null, count: history.lines, error: null }
      : { data: Array.from({ length: history.lines }, (_, i) => ({ id: `line-${i}` })), error: null }
    if (q.table === 'stock_movements') return { data: null, count: history.movements, error: null }
    if (q.table === 'order_line_lots') return { data: null, count: 0, error: null }
    if (ops.includes('update')) return { data: { id: 'p', name: 'PARFUM 100', is_active: false }, error: null }
    if (ops.includes('delete')) return { data: null, error: null }
    return { data: { id: 'p', name: 'PARFUM 100', is_active: true }, error: null }
  }
  mocks.admin.mockResolvedValue({
    from: (table: string) => {
      const q: Query = { table, calls: [] }
      queries.push(q)
      const builder: Record<string, unknown> = {}
      for (const name of ['select', 'eq', 'in', 'update', 'delete', 'single', 'limit', 'order'])
        builder[name] = (...args: unknown[]) => { q.calls.push([name, args]); return builder }
      builder.then = (ok: (value: unknown) => unknown, fail: (reason: unknown) => unknown) => Promise.resolve(resolve(q)).then(ok, fail)
      return builder
    },
  })
  return queries
}

beforeEach(() => mocks.admin.mockReset())

it('archives a best-seller without sending its order line ids in the URL', async () => {
  const queries = setup({ lines: 718, movements: 922 })
  const result = await deleteProduct('p', 'org-a')
  expect(result).toMatchObject({ deleted: false, product: { is_active: false } })
  expect(queries.flatMap(q => q.calls).some(([name]) => name === 'in')).toBe(false)
  expect(queries.some(q => q.calls.some(([name]) => name === 'delete'))).toBe(false)
  const lines = queries.find(q => q.table === 'order_lines')!
  expect(lines.calls).toContainEqual(['eq', ['order.organization_id', 'org-a']])
})

it('still deletes a product that was never sold nor stocked', async () => {
  const queries = setup({ lines: 0, movements: 0 })
  expect(await deleteProduct('p', 'org-a')).toMatchObject({ deleted: true })
  expect(queries.some(q => q.table === 'products' && q.calls.some(([name]) => name === 'delete'))).toBe(true)
})
