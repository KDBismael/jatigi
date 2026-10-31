import { notificationConfigMissing } from '@/lib/notification-config'
import { timingSafeEqual } from 'node:crypto'
import { processBillingLifecycle } from '@/services/billing-lifecycle'
import {
  createNotificationRepository,
  processNotificationJobs,
  scheduleActivationReminders,
} from '@/services/notification-service'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET,
    authorization = Buffer.from(request.headers.get('authorization') ?? ''),
    expected = Buffer.from(`Bearer ${secret}`)
  if (
    !secret ||
    authorization.length !== expected.length ||
    !timingSafeEqual(authorization, expected)
  )
    return Response.json({ error: 'Non autorisé' }, { status: 401 })
  const missing = notificationConfigMissing(process.env)
  if (missing.length) return Response.json(
    { error: 'Configuration des emails incomplète.', missing },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  )
  if (new URL(request.url).searchParams.get('dryRun') === '1')
    return Response.json({ ready: true, dryRun: true }, { headers: { 'Cache-Control': 'no-store' } })
  try {
    const billing = await processBillingLifecycle()
    const repo = await createNotificationRepository()
    const scheduled = await scheduleActivationReminders(repo)
    const notifications = await processNotificationJobs(repo)
    return Response.json(
      { billing, scheduled, notifications },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return Response.json(
      {
        error: 'Traitement interrompu. Les tâches conservées seront reprises.',
      },
      { status: 500 },
    )
  }
}
