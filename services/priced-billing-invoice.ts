import {randomUUID} from 'node:crypto'
import type {SupabaseClient} from '@supabase/supabase-js'
import {BillingAccessError} from '@/lib/billing/access'
import type {BillingInvoice} from './billing-service'
export interface PricedInvoiceInput {
  organizationId:string;userId:string;plan:'pro'|'business';cycle:'monthly'|'yearly';amount:number;country:string;origin:string;mode:'test'|'live'
}
/** Server-priced invoice preparation; the existing unique pending-invoice index serializes races. */
export async function preparePricedBillingInvoice(db:SupabaseClient,input:PricedInvoiceInput,reconcile?:(invoiceId:string)=>Promise<{state:string}>):Promise<BillingInvoice> {
  if(!Number.isSafeInteger(input.amount)||input.amount<100||input.amount>5000000)throw new Error('INVALID_BILLING_PRICE')
  async function pending() {
    const result=await db.from('billing_invoices').select('*')
      .eq('organization_id',input.organizationId).eq('mode',input.mode).eq('state','pending')
      .order('created_at',{ascending:false}).limit(1).maybeSingle()
    if(result.error)throw new Error(result.error.message)
    return result.data as (BillingInvoice&{retry_after?:string|null})|null
  }
  function resume(invoice:BillingInvoice&{retry_after?:string|null}) {
    if(invoice.plan!==input.plan||invoice.cycle!==input.cycle)
      throw new BillingAccessError('BILLING_PAYMENT_PENDING','Un paiement attend déjà une confirmation. Reprenez-le avant de changer d’offre.',409)
    if(invoice.amount!==input.amount)
      throw new BillingAccessError('BILLING_PRICE_PENDING','Un paiement à l’ancien tarif est encore ouvert. Dans Abonnement, ouvrez Historique des paiements puis « Vérifier ce paiement ». Si le lien reste actif, attendez son expiration avant de choisir le nouveau tarif.',409)
    if(invoice.retry_after&&Date.parse(invoice.retry_after)>Date.now())
      throw new BillingAccessError('BILLING_RETRY_LATER','Attendez quelques secondes avant de reprendre cette demande.',429)
    return invoice
  }
  const existing=await pending()
  if(existing) {
    const oldPrice=existing.plan===input.plan&&existing.cycle===input.cycle&&existing.amount!==input.amount
    if(oldPrice&&existing.checkout_session_id&&reconcile) {
      const checked=await reconcile(existing.id)
      if(checked.state==='paid')return {...existing,state:'paid'}
      if(checked.state!=='expired')return resume(existing)
      // Re-read after reconciliation: another checkout may already have won the race.
      const current=await pending()
      if(current)return resume(current)
    } else return resume(existing)
  }
  const id=randomUUID(),reference=`warko-${input.mode}-${id}`
  const result=await db.from('billing_invoices').insert({
    id,organization_id:input.organizationId,created_by:input.userId,mode:input.mode,
    plan:input.plan,cycle:input.cycle,amount:input.amount,state:'pending',reference,idempotency_key:randomUUID(),
    checkout_request:{amount:input.amount,currency:'XOF',title:input.plan==='pro'?'Warko Pro':'Warko Business',
      country:input.country,reference,metadata:{orderId:id,organizationId:input.organizationId},integrationMode:'redirect',
      successUrl:`${input.origin}/subscription?invoice=${id}`,cancelUrl:`${input.origin}/subscription?invoice=${id}`},
  }).select('*').single()
  if(result.error?.code==='23505'){
    const raced=await pending()
    if(raced)return resume(raced)
  }
  if(result.error||!result.data)throw new Error(result.error?.message??'BILLING_UNAVAILABLE')
  return result.data as BillingInvoice
}
