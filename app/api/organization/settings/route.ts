import { NextRequest, NextResponse } from 'next/server'
import { getOrderContext } from '@/lib/order-context'
import { createAdminClient } from '@/services/supabase/server'
import { shopSettingsSchema } from '@/lib/onboarding'

export async function PATCH(request: NextRequest) {
  const auth = await getOrderContext()
  if (!auth) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (auth.profile.role !== 'admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  const parsed = shopSettingsSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  const supabase = await createAdminClient()
  const { data, error } = await supabase.from('organizations').update(parsed.data).eq('id', auth.profile.organization_id).select('*').single()
  if (error || !data) return NextResponse.json({ error: 'Modification impossible' }, { status: 500 })
  return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } })
}
