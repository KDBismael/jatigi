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
