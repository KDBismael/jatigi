import { createAdminClient } from '@/services/supabase/server'
import type { EventProps, ServerEvent } from '@/lib/analytics-events'

/** Records a business event after a successful write; failures are logged, never thrown. */
export async function recordEvent(
  name: ServerEvent,
  ctx: { userId: string; organizationId: string | null },
  props: EventProps = {},
): Promise<void> {
  try {
    const db = await createAdminClient()
    const { error } = await db.from('app_events').insert({
      name, anonymous_id: ctx.userId, user_id: ctx.userId, organization_id: ctx.organizationId, props,
    })
    if (error) console.error('[analytics] event not recorded:', name, error.message)
  } catch (error) {
    console.error('[analytics] event not recorded:', name, error)
  }
}
