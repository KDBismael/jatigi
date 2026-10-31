import { afterEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  billing: vi.fn(async () => ({})),
  schedule: vi.fn(async () => 1),
  process: vi.fn(async () => ({ sent: 1 })),
  repo: vi.fn(async () => ({})),
  update: vi.fn(async () => ({ error: null })),
}))
vi.mock('@/services/billing-lifecycle', () => ({
  processBillingLifecycle: mocks.billing,
}))
vi.mock('@/services/notification-service', () => ({
  createNotificationRepository: mocks.repo,
  scheduleActivationReminders: mocks.schedule,
  processNotificationJobs: mocks.process,
}))
vi.mock('@/services/supabase/server', () => ({
  createAdminClient: async () => ({
    from: () => ({ update: () => ({ eq: mocks.update }) }),
  }),
}))
import { GET as cron } from '@/app/api/jobs/lifecycle/route'
import {
  GET as unsubscribe,
  POST as oneClick,
} from '@/app/api/notifications/unsubscribe/route'
import { createUnsubscribeToken } from '@/services/notification-provider'
afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})
it('rejects unauthenticated cron before processing billing or sending', async () => {
  vi.stubEnv('CRON_SECRET', 'secret')
  expect(
    (await cron(new Request('https://warko.test/api/jobs/lifecycle'))).status,
  ).toBe(401)
  expect(mocks.billing).not.toHaveBeenCalled()
})
it('awaits billing then scheduling and delivery for authenticated cron', async () => {
  for (const [key,value] of Object.entries({RESEND_API_KEY:'re_qa',NOTIFICATION_FROM_EMAIL:'qa@warko.test',NOTIFICATION_UNSUBSCRIBE_SECRET:'qa',APP_BASE_URL:'https://warko.test'})) vi.stubEnv(key,value)
  vi.stubEnv('CRON_SECRET', 'secret')
  const response = await cron(
    new Request('https://warko.test/api/jobs/lifecycle', {
      headers: { Authorization: 'Bearer secret' },
    }),
  )
  expect(response.status).toBe(200)
  expect(mocks.billing).toHaveBeenCalledOnce()
  expect(mocks.process).toHaveBeenCalledOnce()
})
it('rejects unsigned unsubscribe and accepts signed GET and one click POST', async () => {
  vi.stubEnv('NOTIFICATION_UNSUBSCRIBE_SECRET', 'test')
  expect(
    (await unsubscribe(new Request('https://warko.test/?token=bad'))).status,
  ).toBe(400)
  const url = `https://warko.test/?token=${createUnsubscribeToken('org')}`
  expect((await unsubscribe(new Request(url))).status).toBe(200)
  expect((await oneClick(new Request(url, { method: 'POST' }))).status).toBe(
    200,
  )
  expect(mocks.update).toHaveBeenCalledWith('id', 'org')
})
it('rejects non ASCII bearer input without throwing', async () => {
  vi.stubEnv('CRON_SECRET', 'secret')
  expect(
    (
      await cron(
        new Request('https://warko.test/api/jobs/lifecycle', {
          headers: { Authorization: 'Bearer sécret' },
        }),
      )
    ).status,
  ).toBe(401)
})
