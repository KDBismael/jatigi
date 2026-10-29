import { NextRequest, NextResponse } from 'next/server'
import { getOrderContext } from '@/lib/order-context'
import { createAdminClient } from '@/services/supabase/server'
import { getOnboardingProgress } from '@/services/onboarding-service'
import { onboardingPatchSchema } from '@/lib/onboarding'

export async function GET() {
  const auth = await getOrderContext()
  if (!auth) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (auth.profile.role !== 'admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  try {
    return NextResponse.json(await getOnboardingProgress(auth.profile.organization_id), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'Impossible de charger la progression' }, { status: 500 })
  }
}
export async function PATCH(request: NextRequest) {
  const auth = await getOrderContext()
  if (!auth) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (auth.profile.role !== 'admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  const parsed = onboardingPatchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Étape invalide' }, { status: 400 })
  const supabase = await createAdminClient()
  const { error } = await supabase.from('organizations').update({
    onboarding_step: parsed.data.step,
    ...(parsed.data.skipped_steps ? { onboarding_skipped_steps: [...new Set(parsed.data.skipped_steps)] } : {}),
    onboarding_started_at: new Date().toISOString(),
  }).eq('id', auth.profile.organization_id)
  if (error) return NextResponse.json({ error: 'Progression non enregistrée' }, { status: 500 })
  return GET()
}
