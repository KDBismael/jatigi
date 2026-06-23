import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'
import { z } from 'zod'
import { updateStockLot } from '@/services/stock-lot-service'

const lotUpdateSchema = z.object({
  sale_price: z.coerce.number().positive().optional(),
  quantity_available: z.coerce.number().int().min(0).optional(),
  total_purchase: z.coerce.number().min(0).optional(),
  total_transport: z.coerce.number().min(0).optional(),
  total_packaging: z.coerce.number().min(0).optional(),
  received_at: z.string().optional(),
})

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()
  return profile?.role === 'admin' && profile.organization_id ? { user, profile } : null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lotId: string }> },
) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id: productId, lotId } = await params
  const body = await request.json()
  const parsed = lotUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const lot = await updateStockLot(lotId, productId, parsed.data, admin.profile.organization_id)
    return NextResponse.json(lot)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
