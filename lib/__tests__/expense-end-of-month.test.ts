import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ inserts: [] as { table: string; value: Record<string, unknown> }[] }))
vi.mock('@/lib/admin-context', () => ({ requireOrganizationAdmin: async () => ({ organizationId: 'org-qa', user: { id: 'user-qa' } }) }))
vi.mock('@/services/supabase/server', () => ({
  createAdminClient: async () => ({
    rpc: async () => ({ data: 0, error: null }),
    from: (table: string) => ({
      insert: (value: Record<string, unknown>) => {
        mocks.inserts.push({ table, value })
        return { select: () => ({ single: async () => ({ data: { id: 'new', ...value }, error: null }) }) }
      },
    }),
  }),
}))
import { POST } from '@/app/api/expenses/route'

const post = (body: Record<string, unknown>) => POST(new NextRequest('http://localhost/api/expenses', { method: 'POST', body: JSON.stringify(body) }))
const base = { category: 'other', label: 'Formation', amount: 81000, expense_date: '2026-10-31', receipt_url: null, sales_person_id: null }

beforeEach(() => { mocks.inserts.length = 0 })

it('saves a one-off expense dated the 31st', async () => {
  const response = await post({ ...base, recurring: false })
  expect(response.status).toBe(201)
  expect(mocks.inserts).toEqual([expect.objectContaining({ table: 'expenses', value: expect.objectContaining({ expense_date: '2026-10-31', amount: 81000 }) })])
})

it('anchors a recurring expense dated after the 28th on the 28th', async () => {
  const response = await post({ ...base, recurring: true })
  expect(response.status).toBe(201)
  expect(mocks.inserts[0]).toEqual({ table: 'expense_recurrences', value: expect.objectContaining({ day_of_month: 28, starts_on: '2026-10-31' }) })
})

it('keeps the chosen day for a recurring expense earlier in the month', async () => {
  await post({ ...base, expense_date: '2026-10-05', recurring: true })
  expect(mocks.inserts[0].value.day_of_month).toBe(5)
})
