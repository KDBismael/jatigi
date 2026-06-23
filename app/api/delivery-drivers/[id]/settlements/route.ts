import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'
import { deliverySettlementSchema } from '@/lib/schemas/delivery-driver.schema'
import { addDeliverySettlement } from '@/services/delivery-driver-service'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role, organization_id').eq('id', user.id).single()
  if (profile?.role !== 'admin' || !profile.organization_id) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }
  const parsed = deliverySettlementSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  try {
    const { id } = await params
    await addDeliverySettlement(id, parsed.data, profile.organization_id, user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors du versement'
    if (message.startsWith('Aucun montant') || message.startsWith('Le versement ne peut pas')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    console.error('[/api/delivery-drivers/:id/settlements] creation failed:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
