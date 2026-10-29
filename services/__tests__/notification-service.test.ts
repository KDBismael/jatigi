import { expect, it, vi, afterEach } from 'vitest'
import {
  processNotificationJobs,
  scheduleActivationReminders,
  type NotificationRepository,
  type NotificationJob,
} from '@/services/notification-service'
const job: NotificationJob = {
  id: 'job',
  organization_id: 'org',
  recipient_user_id: 'owner',
  kind: 'activation_day1',
  channel: 'email',
  payload: {},
  attempts: 1,
}
function repository(
  overrides: Partial<NotificationRepository> = {},
): NotificationRepository {
  return {
    candidates: async () => [],
    enqueue: async () => {},
    claim: async () => [job],
    context: async () => ({
      orders: 0,
      unsubscribed: false,
      email: 'owner@example.test',
      name: 'Awa',
    }),
    save: vi.fn(async () => {}),
    ...overrides,
  }
}
afterEach(() => {
  vi.unstubAllEnvs()
})
it('schedules one durable J+1 job with org-specific dedupe and due date', async () => {
  const jobs: unknown[] = []
  const repo = repository({
    candidates: async () => [
      { id: 'org', owner_id: 'owner', created_at: '2026-10-28T12:00:00Z' },
    ],
    enqueue: async (value) => {
      jobs.push(value)
    },
  })
  await scheduleActivationReminders(repo)
  expect(jobs).toEqual([
    expect.objectContaining({
      dedupe_key: 'activation_day1:org:2026-10-28T12:00:00Z',
      available_at: '2026-10-29T12:00:00.000Z',
    }),
  ])
})
it('rechecks zero orders and skips reminders when an order exists', async () => {
  const repo = repository({
    context: async () => ({
      orders: 1,
      unsubscribed: false,
      email: 'x@y.test',
      name: 'Awa',
    }),
  })
  const send = vi.fn()
  await processNotificationJobs(repo, send)
  expect(send).not.toHaveBeenCalled()
  expect(repo.save).toHaveBeenCalledWith(
    'job',
    expect.objectContaining({ state: 'skipped' }),
  )
})
it('suppresses reminder opt outs while preserving transactional receipt', async () => {
  vi.stubEnv('APP_BASE_URL', 'https://warko.test')
  const repo = repository({
    claim: async () => [
      {
        ...job,
        kind: 'billing_receipt',
        payload: { invoiceId: 'invoice', amount: 5000 },
      },
    ],
    context: async () => ({
      orders: 1,
      unsubscribed: true,
      email: 'x@y.test',
      name: 'Awa',
    }),
  })
  const send = vi.fn(async () => 'provider-id')
  await processNotificationJobs(repo, send)
  expect(send).toHaveBeenCalledOnce()
  expect(repo.save).toHaveBeenCalledWith(
    'job',
    expect.objectContaining({ state: 'sent' }),
  )
})
it('records provider errors and backoff without pretending sent', async () => {
  vi.stubEnv('APP_BASE_URL', 'https://warko.test')
  vi.stubEnv('NOTIFICATION_UNSUBSCRIBE_SECRET', 'test')
  const repo = repository()
  await processNotificationJobs(
    repo,
    async () => {
      throw new Error('provider refused')
    },
    new Date('2026-10-29T00:00:00Z'),
  )
  expect(repo.save).toHaveBeenCalledWith(
    'job',
    expect.objectContaining({
      state: 'pending',
      last_error: 'provider refused',
      available_at: '2026-10-29T00:01:00.000Z',
    }),
  )
})
it('does not send a job whose current recipient has unsubscribed', async () => {
  const repo = repository({
    context: async () => ({
      orders: 0,
      unsubscribed: true,
      email: 'x@y.test',
      name: 'Awa',
    }),
  })
  const send = vi.fn()
  await processNotificationJobs(repo, send)
  expect(send).not.toHaveBeenCalled()
  expect(repo.save).toHaveBeenCalledWith(
    'job',
    expect.objectContaining({ state: 'skipped' }),
  )
})
it('skips old renewal reminders after the billing period changes', async () => {
  const repo = repository({
    claim: async () => [{ ...job, kind: 'renewal_due' }],
    context: async () => ({
      orders: 0,
      unsubscribed: false,
      email: 'x@y.test',
      name: 'Awa',
      reminderValid: false,
    }),
  })
  const send = vi.fn()
  await processNotificationJobs(repo, send)
  expect(send).not.toHaveBeenCalled()
  expect(repo.save).toHaveBeenCalledWith(
    'job',
    expect.objectContaining({ state: 'skipped' }),
  )
})
