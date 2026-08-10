import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/services/supabase/server'
import { requireOrganizationAdmin } from '@/lib/admin-context'
import { goalSchema } from '@/lib/schemas/pilotage.schema'

export async function GET(request: NextRequest) {
  const auth = await requireOrganizationAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const month = request.nextUrl.searchParams.get('month') ?? `${new Date().toISOString().slice(0, 7)}-01`
  const db = await createAdminClient()
  const { data } = await db
    .from('monthly_goals')
    .select('*')
    .eq('organization_id', auth.organizationId)
    .eq('month', month)
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const auth = await requireOrganizationAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = goalSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const db = await createAdminClient()
  const input = parsed.data

  if (input.scope === 'seller') {
    const { data: seller } = await db
      .from('sales_people')
      .select('id')
      .eq('id', input.seller_id!)
      .eq('organization_id', auth.organizationId)
      .single()
    if (!seller) return NextResponse.json({ error: 'Vendeur introuvable' }, { status: 400 })
  }

  const payload = {
    ...input,
    organization_id: auth.organizationId,
    seller_id: input.scope === 'seller' ? input.seller_id : null,
    live_session_id: input.scope === 'live' ? input.live_session_id : null,
  }

  let query = db
    .from('monthly_goals')
    .select('id')
    .eq('organization_id', auth.organizationId)
    .eq('month', input.month)
    .eq('scope', input.scope)

  if (input.scope === 'seller') query = query.eq('seller_id', input.seller_id!)
  if (input.scope === 'live') query = query.eq('live_session_id', input.live_session_id!)

  const existing = await query.maybeSingle()
  const result = existing.data
    ? await db.from('monthly_goals').update({ amount: input.amount }).eq('id', existing.data.id).select().single()
    : await db.from('monthly_goals').insert(payload).select().single()

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
  return NextResponse.json(result.data, { status: 201 })
}
