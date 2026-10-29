import { createAdminClient } from '@/services/supabase/server'
import {
  createUnsubscribeToken,
  notificationMessage,
  reminderDueAt,
  sendEmail,
} from './notification-provider'
export interface NotificationJob {
  id: string
  organization_id: string
  recipient_user_id: string | null
  kind: string
  channel: string
  payload: Record<string, unknown>
  attempts: number
  lease_until?: string
}
interface Candidate {
  id: string
  owner_id: string
  created_at: string
}
interface Context {
  orders: number
  unsubscribed: boolean
  email: string | null
  name: string
  reminderValid?: boolean
}
export interface NotificationRepository {
  candidates: () => Promise<Candidate[]>
  enqueue: (job: Record<string, unknown>) => Promise<void>
  claim: () => Promise<NotificationJob[]>
  context: (job: NotificationJob) => Promise<Context>
  save: (id: string, patch: Record<string, unknown>) => Promise<void>
}
export async function scheduleActivationReminders(
  repo: NotificationRepository,
) {
  let count = 0
  for (const org of await repo.candidates()) {
    await repo.enqueue({
      organization_id: org.id,
      recipient_user_id: org.owner_id,
      kind: 'activation_day1',
      channel: 'email',
      dedupe_key: `activation_day1:${org.id}:${org.created_at}`,
      payload: {},
      available_at: reminderDueAt(org.created_at),
    })
    count++
  }
  return count
}
export async function processNotificationJobs(
  repo: NotificationRepository,
  send: typeof sendEmail = sendEmail,
  now = new Date(),
) {
  let sent = 0,
    skipped = 0,
    failed = 0
  for (const job of await repo.claim()) {
    try {
      const context = await repo.context(job),
        transactional = job.kind === 'billing_receipt'
      if (
        job.channel !== 'email' ||
        context.reminderValid === false ||
        (!transactional && context.unsubscribed) ||
        (job.kind === 'activation_day1' && context.orders > 0)
      ) {
        await repo.save(job.id, {
          state: 'skipped',
          lease_until: null,
          last_error: null,
        })
        skipped++
        continue
      }
      if (!context.email)
        throw new Error('Adresse email du destinataire absente')
      const baseUrl = process.env.APP_BASE_URL?.replace(/\/$/, '')
      if (
        !baseUrl ||
        (!baseUrl.startsWith('https://') && process.env.NODE_ENV !== 'test')
      )
        throw new Error('APP_BASE_URL HTTPS non configuré')
      const token = transactional
        ? ''
        : createUnsubscribeToken(job.organization_id)
      const message = notificationMessage(
        job.kind,
        { ...job.payload, name: context.name },
        baseUrl!,
        token,
      )
      await send(
        {
          ...message,
          to: context.email,
          ...(!transactional
            ? {
                unsubscribeUrl: `${baseUrl}/api/notifications/unsubscribe?token=${encodeURIComponent(token)}`,
              }
            : {}),
        },
        `notification-${job.id}`,
      )
      await repo.save(job.id, {
        state: 'sent',
        sent_at: new Date().toISOString(),
        lease_until: null,
        last_error: null,
      })
      sent++
    } catch (error) {
      await repo.save(job.id, {
        state: job.attempts >= 5 ? 'failed' : 'pending',
        available_at: new Date(
          now.getTime() +
            Math.min(3600, 60 * 2 ** Math.max(0, job.attempts - 1)) * 1000,
        ).toISOString(),
        lease_until: null,
        last_error: (error instanceof Error
          ? error.message
          : 'Erreur notification'
        ).slice(0, 500),
      })
      failed++
    }
  }
  return { sent, skipped, failed }
}
export async function createNotificationRepository(): Promise<NotificationRepository> {
  const db = await createAdminClient()
  const leases = new Map<string, string | undefined>()
  return {
    async candidates() {
      const rows: Candidate[] = []
      for (let offset = 0; ; offset += 100) {
        const { data, error } = await db
          .from('organizations')
          .select('id,owner_id,created_at')
          .is('notifications_unsubscribed_at', null)
          .order('id')
          .range(offset, offset + 99)
        if (error) throw error
        rows.push(...(data ?? []))
        if (!data || data.length < 100) break
      }
      return rows.filter((row) => !!row.owner_id)
    },
    async enqueue(job) {
      const { error } = await db
        .from('notification_jobs')
        .upsert(job, { onConflict: 'dedupe_key', ignoreDuplicates: true })
      if (error) throw error
    },
    async claim() {
      const { data, error } = await db.rpc('claim_notification_jobs', {
        p_limit: 5,
      })
      if (error) throw error
      for (const job of data ?? []) leases.set(job.id, job.lease_until)
      return data ?? []
    },
    async context(job) {
      const { data: org, error } = await db
        .from('organizations')
        .select('owner_id,notifications_unsubscribed_at')
        .eq('id', job.organization_id)
        .single()
      if (error) throw error
      // Always address the current owner; an old queued recipient must not receive a former boutique's data.
      const owner = org.owner_id
      if (!owner) throw new Error('Propriétaire introuvable')
      const [
        { data: profile, error: profileError },
        { data: auth, error: authError },
        { count, error: ordersError },
      ] = await Promise.all([
        db.from('profiles').select('full_name').eq('id', owner).single(),
        db.auth.admin.getUserById(owner),
        db
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', job.organization_id),
      ])
      if (profileError || authError || ordersError)
        throw profileError || authError || ordersError
      let reminderValid = true
      if(job.kind==='billing_receipt') {
        const receipt=await db.from('billing_invoices').select('state').eq('id',String(job.payload.invoiceId)).eq('organization_id',job.organization_id).maybeSingle()
        if(receipt.error)throw receipt.error
        reminderValid=receipt.data?.state==='paid'
      }
      if (job.kind === 'renewal_due' || job.kind === 'grace_reminder') {
        const { getSubscriptionSummary } = await import('./billing-service')
        const current = await getSubscriptionSummary(job.organization_id, owner)
        reminderValid =
          ['active', 'grace'].includes(current.status) &&
          !current.cancelAtPeriodEnd &&
          !!current.periodEnd &&
          new Date(current.periodEnd).getTime() ===
            new Date(String(job.payload.periodEnd)).getTime()
      }
      return {
        reminderValid,
        orders: count ?? 0,
        unsubscribed: !!org.notifications_unsubscribed_at,
        email: auth.user?.email ?? null,
        name: profile?.full_name ?? '',
      }
    },
    async save(id, patch) {
      let update = db
        .from('notification_jobs')
        .update(patch)
        .eq('id', id)
        .eq('state', 'processing')
      const lease = leases.get(id)
      if (lease) update = update.eq('lease_until', lease)
      const { error } = await update
      if (error) throw error
    },
  }
}
