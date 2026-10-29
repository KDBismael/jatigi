import {NextRequest,NextResponse} from 'next/server'
import {getOrderContext} from '@/lib/order-context'
import {getBillingReceipt} from '@/services/billing-service'
import {generateBillingReceiptPdf} from '@/services/billing-receipt-pdf'
import {billingErrorResponse} from '@/lib/billing/access'
export const runtime='nodejs'
export async function GET(_request:NextRequest,{params}:{params:Promise<{id:string}>}) {
 const ctx=await getOrderContext()
 if(!ctx)return NextResponse.json({error:'Authentification requise'},{status:401})
 if(ctx.profile.role!=='admin')return NextResponse.json({error:'Accès réservé au propriétaire'},{status:403})
 try {
  const {id}=await params,receipt=await getBillingReceipt(ctx.profile.organization_id,ctx.user.id,id)
  if(!receipt)return NextResponse.json({error:'Reçu introuvable'},{status:404})
  return new NextResponse(new Uint8Array(await generateBillingReceiptPdf(receipt)),{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="warko-recu-${receipt.id}.pdf"`,'Cache-Control':'private, no-store'}})
 }catch(error){return billingErrorResponse(error)}
}
