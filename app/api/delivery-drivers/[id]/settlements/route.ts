import { canManageDeliveries } from '@/lib/delivery-access'
import { invalidRequest } from '@/lib/api-validation'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'
import { deliverySettlementSchema } from '@/lib/schemas/delivery-driver.schema'
import { addDeliverySettlement, getDeliverySettlementHistory } from '@/services/delivery-driver-service'
import { recordEvent } from '@/services/analytics-events-service'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role, organization_id').eq('id', user.id).single()
  if (!canManageDeliveries(profile?.role) || !profile?.organization_id) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }
  const parsed = deliverySettlementSchema.safeParse(await request.json())
  if (!parsed.success) return invalidRequest(parsed.error)
  try {
    const { id } = await params
    await addDeliverySettlement(id, parsed.data, profile.organization_id, user.id)
    await recordEvent('settlement_recorded', { userId: user.id, organizationId: profile.organization_id }, { role: profile.role })
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

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
 const db=await createClient()
 const {data:{user}}=await db.auth.getUser()
 if(!user)return NextResponse.json({error:'Non autorisé'},{status:401})
 const {data:profile}=await db.from('profiles').select('role,organization_id').eq('id',user.id).single()
 if(!canManageDeliveries(profile?.role)||!profile?.organization_id)return NextResponse.json({error:'Accès refusé'},{status:403})
 try {const {id}=await params;return NextResponse.json(await getDeliverySettlementHistory(id,profile.organization_id))}
 catch{return NextResponse.json({error:'Historique indisponible'},{status:500})}
}
