import { NextRequest, NextResponse } from 'next/server'
import { requireOrganizationAdmin } from '@/lib/admin-context'
import { getOrderContext } from '@/lib/order-context'
import { prepareLogo } from '@/lib/branding'
import { getOrganizationBranding, saveOrganizationLogo } from '@/services/branding-service'
export const runtime = 'nodejs'
export async function GET() {
  const ctx = await getOrderContext()
  if (!ctx) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
  try {
    return NextResponse.json(await getOrganizationBranding(ctx.profile.organization_id), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch { return NextResponse.json({ error: 'Impossible de charger le logo.' }, { status: 500 }) }
}
export async function POST(request: NextRequest) {
  const auth = await requireOrganizationAdmin()
  if (!auth) return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
  if (Number(request.headers.get('content-length')) > 2200000) return NextResponse.json({ error: 'Le logo doit faire au maximum 2 Mo.' }, { status: 413 })
  let bytes: Buffer
  try {
    const form = await request.formData()
    const file = form.get('logo')
    if (!(file instanceof File)) throw new Error('Choisissez un logo PNG ou JPEG.')
    bytes = await prepareLogo(file)
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Logo invalide' }, { status: 400 }) }
  try { return NextResponse.json(await saveOrganizationLogo(auth.organizationId, bytes)) }
  catch { return NextResponse.json({ error: 'Impossible d’enregistrer le logo. Réessayez.' }, { status: 500 }) }
}
export async function DELETE() {
  const auth = await requireOrganizationAdmin()
  if (!auth) return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
  try { return NextResponse.json(await saveOrganizationLogo(auth.organizationId, null)) }
  catch { return NextResponse.json({ error: 'Impossible de retirer le logo.' }, { status: 500 }) }
}
