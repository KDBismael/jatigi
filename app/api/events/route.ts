import { NextRequest } from 'next/server'
import { clientEventSchema } from '@/lib/analytics-events'
import { createAdminClient, createClient } from '@/services/supabase/server'

const done = () => new Response(null, { status: 204 })

/** Public, fire-and-forget collection: always 204 so tracking can never break a page. */
export async function POST(request: NextRequest) {
  try {
    const parsed = clientEventSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return done()
    const { name, anonymous_id, path, props } = parsed.data
    // Identity comes from the session only; ids in the body are ignored.
    const session = await createClient()
    const { data: { user } } = await session.auth.getUser()
    const profile = user ? (await session.from('profiles').select('organization_id').eq('id', user.id).maybeSingle()).data : null
    const db = await createAdminClient()
    const { error } = await db.from('app_events').insert({
      name, anonymous_id, path: path ?? null, props, user_id: user?.id ?? null, organization_id: profile?.organization_id ?? null,
    })
    if (error) console.error('[analytics] event not stored:', error.message)
  } catch (error) {
    console.error('[analytics] event not stored:', error)
  }
  return done()
}
