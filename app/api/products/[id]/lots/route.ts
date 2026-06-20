import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'
import { stockLotSchema } from '@/lib/schemas/stock-lot.schema'
import { addStockLot, getStockLots } from '@/services/stock-lot-service'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  return profile?.role === 'admin' ? { user, profile } : null
}

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id } = await params
  try {
    const lots = await getStockLots(id)
    return NextResponse.json(lots)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id } = await params
  const body = await request.json()
  const parsed = stockLotSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const lot = await addStockLot(parsed.data, id, ctx.profile.organization_id)
    return NextResponse.json(lot, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
