import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getOrderContext } from '@/lib/order-context'
import { reconcileBillingInvoice } from '@/services/billing-service'
import { billingErrorResponse } from '@/lib/billing/access'
export async function POST(request:NextRequest) {
  const ctx=await getOrderContext()
  if(!ctx) return NextResponse.json({error:'Non autorisé'},{status:401})
  if(ctx.profile.role!=='admin') return NextResponse.json({error:'Accès réservé au propriétaire'},{status:403})
  const input=z.object({invoiceId:z.string().uuid()}).strict().safeParse(await request.json().catch(()=>null))
  if(!input.success) return NextResponse.json({error:'Paiement invalide'},{status:400})
  try{return NextResponse.json(await reconcileBillingInvoice(ctx.profile.organization_id,ctx.user.id,input.data.invoiceId),{headers:{'Cache-Control':'no-store'}})}
  catch(error){return billingErrorResponse(error)}
}
