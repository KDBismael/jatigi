import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'
import { productOfferSchema } from '@/lib/schemas/product.schema'
import { createProductOffer } from '@/services/product-offer-service'

async function adminOrganization() {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return null
  const { data } = await db.from('profiles').select('role,organization_id').eq('id', user.id).single()
  return data?.role === 'admin' ? data.organization_id : null
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const organizationId = await adminOrganization()
  if (!organizationId) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  const parsed = productOfferSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  try {
    const { id } = await params
    return NextResponse.json(await createProductOffer(id, parsed.data, organizationId), { status: 201 })
  } catch (error) { return NextResponse.json({ error: String(error) }, { status: 500 }) }
}
