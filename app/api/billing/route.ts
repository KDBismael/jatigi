import { NextResponse } from 'next/server'
import { getOrderContext } from '@/lib/order-context'
import { getSubscriptionSummary } from '@/services/billing-service'
import { billingErrorResponse } from '@/lib/billing/access'
export async function GET() {
  const ctx=await getOrderContext()
  if(!ctx) return NextResponse.json({error:'Non autorisé'},{status:401})
  try { return NextResponse.json(await getSubscriptionSummary(ctx.profile.organization_id,ctx.user.id),{headers:{'Cache-Control':'private, no-store'}}) }
  catch(error) { return billingErrorResponse(error) }
}
