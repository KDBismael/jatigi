import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ inserts: [] as Record<string, unknown>[], user: null as { id: string } | null, insertError: null as unknown }))
vi.mock('@/services/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mocks.user } }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: mocks.user ? { organization_id: 'org-session' } : null }) }) }) }),
  }),
  createAdminClient: async () => ({
    from: () => ({ insert: async (row: Record<string, unknown>) => { mocks.inserts.push(row); return { error: mocks.insertError } } }),
  }),
}))
import { POST } from '@/app/api/events/route'
import { recordEvent } from '@/services/analytics-events-service'

const anon = '30000000-0000-4000-8000-000000000001'
const send = (body: unknown) => POST(new NextRequest('http://localhost/api/events', { method: 'POST', body: JSON.stringify(body) }))
beforeEach(() => { mocks.inserts.length = 0; mocks.user = null; mocks.insertError = null })

it('stores a known anonymous event and answers 204', async () => {
  const response = await send({ name: 'landing_view', anonymous_id: anon, path: '/', props: { source: 'facebook' } })
  expect(response.status).toBe(204)
  expect(mocks.inserts).toEqual([{ name: 'landing_view', anonymous_id: anon, path: '/', props: { source: 'facebook' }, user_id: null, organization_id: null }])
})

it('takes the user and shop from the session, never from the body', async () => {
  mocks.user = { id: 'user-session' }
  await send({ name: 'subscription_view', anonymous_id: anon, user_id: 'forged', organization_id: 'forged' })
  expect(mocks.inserts[0]).toMatchObject({ user_id: 'user-session', organization_id: 'org-session' })
})

it.each([
  [{ name: 'order_created', anonymous_id: anon }],
  [{ name: 'landing_view', anonymous_id: 'not-a-uuid' }],
  [{ name: 'landing_view', anonymous_id: anon, props: Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`k${String.fromCharCode(97 + i)}`, 1])) }],
  ['not json at all'],
])('drops invalid or server-only events silently (%#)', async (body) => {
  expect((await send(body)).status).toBe(204)
  expect(mocks.inserts).toHaveLength(0)
})

it('never fails the caller when the database refuses the event', async () => {
  mocks.insertError = { message: 'relation "app_events" does not exist' }
  expect((await send({ name: 'landing_view', anonymous_id: anon })).status).toBe(204)
  mocks.insertError = { message: 'down' }
  await expect(recordEvent('order_created', { userId: 'u', organizationId: 'o' }, { status: 'received' })).resolves.toBeUndefined()
  expect(mocks.inserts.at(-1)).toEqual({ name: 'order_created', anonymous_id: 'u', user_id: 'u', organization_id: 'o', props: { status: 'received' } })
})
