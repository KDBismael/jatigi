import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOrganizationAdmin } from '@/lib/admin-context'
import { setDeliveryDriverActive } from '@/services/delivery-driver-service'

const schema = z.object({ is_active: z.boolean() }).strict()
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOrganizationAdmin()
  if (!auth) return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Statut du livreur invalide' }, { status: 400 })
  try {
    const { id } = await params
    const driver = await setDeliveryDriverActive(id, parsed.data.is_active, auth.organizationId)
    if (!driver) return NextResponse.json({ error: 'Livreur introuvable' }, { status: 404 })
    return NextResponse.json(driver, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'Impossible de modifier le livreur. Réessayez.' }, { status: 500 })
  }
}
