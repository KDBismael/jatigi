import { NextRequest, NextResponse } from 'next/server'
import { getOrderContext } from '@/lib/order-context'
import { canManageDeliveries } from '@/lib/delivery-access'
import { deliveryDaySchema } from '@/lib/delivery-balance'
import { getDeliveryDayReport } from '@/services/delivery-balance-service'
export async function GET(request: NextRequest) {
  const ctx = await getOrderContext()
  if (!ctx) return NextResponse.json({error:'Non autorisé'},{status:401})
  if (!canManageDeliveries(ctx.profile.role)) return NextResponse.json({error:'Accès refusé'},{status:403})
  const parsed = deliveryDaySchema.safeParse({date:request.nextUrl.searchParams.get('date')})
  if (!parsed.success) return NextResponse.json({error:'Choisissez une date de tournée valide.'},{status:400})
  try {
    return NextResponse.json(await getDeliveryDayReport(ctx.profile.organization_id,parsed.data.date),{headers:{'Cache-Control':'private, no-store'}})
  } catch {
    return NextResponse.json({error:'Impossible de charger le bilan. Réessayez.'},{status:500})
  }
}
