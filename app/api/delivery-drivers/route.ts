import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'
import { deliveryDriverSchema } from '@/lib/schemas/delivery-driver.schema'
import { createDeliveryDriver, getDeliveryDrivers } from '@/services/delivery-driver-service'

async function getAuthContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role, organization_id').eq('id', user.id).single()
  return profile?.organization_id ? { user, profile } : null
}

export async function GET() {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  try {
    const drivers = await getDeliveryDrivers(auth.profile.organization_id)
    if (auth.profile.role !== 'admin') {
      return NextResponse.json(drivers.map((driver) => ({
        ...driver,
        packages_assigned: 0,
        packages_in_progress: 0,
        packages_delivered: 0,
        packages_cancelled: 0,
        success_rate: 0,
        amount_collected: 0,
        amount_remitted: 0,
        amount_due: 0,
      })))
    }
    return NextResponse.json(drivers)
  } catch (error) {
    console.error('[/api/delivery-drivers] loading failed:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (auth.profile.role !== 'admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  const parsed = deliveryDriverSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  try {
    return NextResponse.json(await createDeliveryDriver(parsed.data, auth.profile.organization_id), { status: 201 })
  } catch (error) {
    console.error('[/api/delivery-drivers] creation failed:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
