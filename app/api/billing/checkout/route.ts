import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getOrderContext } from '@/lib/order-context'
import { checkoutSubscription } from '@/services/billing-service'
import { billingErrorResponse } from '@/lib/billing/access'
import { recordEvent } from '@/services/analytics-events-service'
const schema=z.object({plan:z.enum(['pro','business']),cycle:z.enum(['monthly','yearly'])}).strict()
export async function POST(request:NextRequest) {
  const ctx=await getOrderContext()
  if(!ctx) return NextResponse.json({error:'Non autorisé'},{status:401})
  if(ctx.profile.role!=='admin') return NextResponse.json({error:'Accès réservé au propriétaire'},{status:403})
  const input=schema.safeParse(await request.json().catch(()=>null))
  if(!input.success) return NextResponse.json({error:'Choisissez une offre et une périodicité valides.'},{status:400})
  try {const checkout=await checkoutSubscription(ctx.profile.organization_id,ctx.user.id,input.data.plan,input.data.cycle);await recordEvent('checkout_started',{userId:ctx.user.id,organizationId:ctx.profile.organization_id},{plan:input.data.plan,cycle:input.data.cycle});return NextResponse.json(checkout,{headers:{'Cache-Control':'no-store'}})}
  catch(error){return billingErrorResponse(error)}
}
