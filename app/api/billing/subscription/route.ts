import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getOrderContext } from '@/lib/order-context'
import { updateSubscription } from '@/services/billing-service'
import { billingErrorResponse } from '@/lib/billing/access'
const schema=z.object({action:z.enum(['cancel','resume','downgrade']),plan:z.enum(['discovery','pro','business']).optional()}).strict()
export async function POST(request:NextRequest) {
  const ctx=await getOrderContext()
  if(!ctx) return NextResponse.json({error:'Non autorisé'},{status:401})
  if(ctx.profile.role!=='admin') return NextResponse.json({error:'Accès réservé au propriétaire'},{status:403})
  const input=schema.safeParse(await request.json().catch(()=>null))
  if(!input.success) return NextResponse.json({error:'Demande invalide'},{status:400})
  try{return NextResponse.json(await updateSubscription(ctx.profile.organization_id,ctx.user.id,input.data.action,input.data.plan),{headers:{'Cache-Control':'no-store'}})}
  catch(error){return billingErrorResponse(error)}
}
