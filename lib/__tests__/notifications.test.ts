import { afterEach, expect, it, vi } from 'vitest'
import {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
  reminderDueAt,
  notificationMessage,
  sendEmail,
} from '@/services/notification-provider'
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})
it('schedules J+1 from signup timestamp, never before 24 hours', () => {
  expect(reminderDueAt('2026-10-29T12:17:00Z')).toBe('2026-10-30T12:17:00.000Z')
})
it('signs org scoped unsubscribe tokens and rejects tampering', () => {
  vi.stubEnv('NOTIFICATION_UNSUBSCRIBE_SECRET', 'unit-test-secret')
  const token = createUnsubscribeToken('org-a')
  expect(verifyUnsubscribeToken(token)).toBe('org-a')
  expect(verifyUnsubscribeToken(token + 'x')).toBeNull()
})
it('escapes names in email and links onboarding without read tracking', () => {
  const result = notificationMessage(
    'activation_day1',
    { name: '<Awa>', organizationId: 'org-a' },
    'https://warko.test',
    'signed',
  )
  expect(result.html).toContain('&lt;Awa&gt;')
  expect(result.html).toContain('/onboarding')
  expect(result.html).toContain('/api/notifications/unsubscribe?token=signed')
  expect(result.subject).toContain('<Awa>')
  expect(result.html).not.toContain('<img')
})
it('missing provider config fails instead of pretending a send', async () => {
  vi.stubEnv('RESEND_API_KEY', '')
  await expect(
    sendEmail({ to: 'owner@example.test', subject: 'Test', html: 'Test' }),
  ).rejects.toThrow(/configuré/)
})
it('provider rejection remains failure and idempotency key is used', async () => {
  vi.stubEnv('RESEND_API_KEY', 'fake')
  vi.stubEnv('NOTIFICATION_FROM_EMAIL', 'test@example.test')
  let headers: HeadersInit | undefined
  vi.stubGlobal('fetch', async (_: unknown, init: RequestInit) => {
    headers = init.headers
    return Response.json({ message: 'rate limited' }, { status: 429 })
  })
  await expect(
    sendEmail(
      { to: 'owner@example.test', subject: 'Test', html: 'Test' },
      'job-1',
    ),
  ).rejects.toThrow(/429/)
  expect((headers as Record<string, string>)['Idempotency-Key']).toBe('job-1')
})
it('receipts remain transactional and use authenticated pdf link', () => {
  const result = notificationMessage(
    'billing_receipt',
    { invoiceId: 'inv', amount: 5000, plan: 'pro' },
    'https://warko.test',
    '',
  )
  expect(result.html).toContain('/api/billing/receipts/inv')
  expect(result.html).not.toContain('unsubscribe')
})
