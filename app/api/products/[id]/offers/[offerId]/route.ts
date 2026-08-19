import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'
import { productOfferUpdateSchema } from '@/lib/schemas/product.schema'
import { deleteProductOffer, updateProductOffer } from '@/services/product-offer-service'

async function adminOrganization() {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return null
  const { data } = await db.from('profiles').select('role,organization_id').eq('id', user.id).single()
  return data?.role === 'admin' ? data.organization_id : null
}

type Context = { params: Promise<{ id: string; offerId: string }> }
export async function PUT(request: NextRequest, { params }: Context) {
  const organizationId = await adminOrganization()
  if (!organizationId) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  const parsed = productOfferUpdateSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  try {
    const { id, offerId } = await params
    return NextResponse.json(await updateProductOffer(id, offerId, parsed.data, organizationId))
  } catch (error) { return NextResponse.json({ error: String(error) }, { status: 500 }) }
}

export async function DELETE(_: NextRequest, { params }: Context) {
  const organizationId = await adminOrganization()
  if (!organizationId) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  try {
    const { id, offerId } = await params
    return NextResponse.json(await deleteProductOffer(id, offerId, organizationId))
  } catch (error) { return NextResponse.json({ error: String(error) }, { status: 500 }) }
}
