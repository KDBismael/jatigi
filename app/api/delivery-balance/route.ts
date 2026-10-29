import { requireFeature } from '@/services/billing-service'
import { billingErrorResponse, BillingAccessError } from '@/lib/billing/access'
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
    await requireFeature(ctx.profile.organization_id,'dailyBalance',parsed.data.date)
    return NextResponse.json(await getDeliveryDayReport(ctx.profile.organization_id,parsed.data.date),{headers:{'Cache-Control':'private, no-store'}})
  } catch (error) {
    if(error instanceof BillingAccessError) return billingErrorResponse(error)
    return NextResponse.json({error:'Impossible de charger le bilan. Réessayez.'},{status:500})
  }
}
