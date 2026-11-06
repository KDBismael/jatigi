import {HAS_CUSTOM_BILLING_PRICES} from '@/lib/billing/pricing'
import {preparePricedBillingInvoice} from './priced-billing-invoice'
import {visiblePaymentState} from '@/lib/billing/payment-state'
import { TEST_BILLING_PRICES } from '@/lib/billing/test-pricing'
import { prepareTestBillingInvoice } from './test-billing-invoice'
import { createAdminClient } from '@/services/supabase/server'
import { PLANS, type PlanId, type BillingCycle, type SubscriptionSummary } from '@/lib/billing/plans'
import { BillingAccessError } from '@/lib/billing/access'
import { createMonerizSession, getMonerizMode, MonerizError, readMonerizPayment, readMonerizSession, type MonerizMode, type MonerizCheckoutRequest, type MonerizEvent } from '@/lib/billing/moneriz'

export interface BillingInvoice {
  id:string; organization_id:string; mode:MonerizMode; plan:'pro'|'business'; cycle:BillingCycle; amount:number;
  reference:string; idempotency_key:string; checkout_request:MonerizCheckoutRequest;
  checkout_session_id:string|null; checkout_url:string|null; state:string; paid_at:string|null; created_at:string; last_payment_status?:string|null;
}
interface Grant {plan:'pro'|'business';period_start:string;period_end:string;revoked_at:string|null;invoice_id:string|null;invoice:{mode:MonerizMode;cycle:BillingCycle}|null}
function fail(error: {message:string}|null) { if (error) throw new Error(error.message) }
async function runtimeMode(db: Awaited<ReturnType<typeof createAdminClient>>) {
  const {data,error}=await db.from('billing_settings').select('mode').eq('singleton',true).single()
  fail(error)
  if(!data) throw new Error('BILLING_MODE_MISMATCH')
  return data.mode as MonerizMode
}
export async function getSubscriptionSummary(organizationId:string,userId:string):Promise<SubscriptionSummary> {
  const db=await createAdminClient(), now=Date.now(), mode=await runtimeMode(db)
  const [organization,preferences,grants,usage,drivers,users]=await Promise.all([
    db.from('organizations').select('owner_id').eq('id',organizationId).single(),
    db.from('organization_subscriptions').select('cancel_at_period_end,pending_plan').eq('organization_id',organizationId).maybeSingle(),
    db.from('subscription_grants').select('plan,period_start,period_end,revoked_at,invoice_id,invoice:billing_invoices(mode,cycle)').eq('organization_id',organizationId).is('revoked_at',null).gte('period_end',new Date(now-3*86400000).toISOString()),
    db.from('organization_usage').select('orders_count').eq('organization_id',organizationId).eq('month',new Date().toISOString().slice(0,7)+'-01').maybeSingle(),
    db.from('delivery_drivers').select('id',{count:'exact',head:true}).eq('organization_id',organizationId).eq('is_active',true),
    db.from('profiles').select('id',{count:'exact',head:true}).eq('organization_id',organizationId),
  ])
  for (const result of [organization,preferences,grants,usage,drivers,users]) fail(result.error)
  if(!organization.data) throw new Error('BILLING_OWNER_REQUIRED')
  const prefs=preferences.data, canManageBilling=organization.data.owner_id===userId
  const candidates=((grants.data??[]) as unknown as Grant[]).filter(g=>!g.invoice_id||g.invoice?.mode===mode)
  const active=candidates.filter(g=>Date.parse(g.period_start)<=now && (Date.parse(g.period_end)>now || (!prefs?.cancel_at_period_end&&!prefs?.pending_plan&&Date.parse(g.period_end)+3*86400000>now)))
    .sort((a,b)=>Number(Date.parse(b.period_end)>now)-Number(Date.parse(a.period_end)>now)||(b.plan==='business'?2:1)-(a.plan==='business'?2:1)||Date.parse(b.period_end)-Date.parse(a.period_end))[0]
  const plan:PlanId=active?.plan??'discovery', config=PLANS[plan]
  let payments:SubscriptionSummary['payments']=[]
  if (canManageBilling) {
    const result=await db.from('billing_invoices').select('id,plan,cycle,amount,state,last_payment_status,created_at,paid_at').eq('organization_id',organizationId).eq('mode',mode).order('created_at',{ascending:false}).limit(100)
    fail(result.error)
    payments=(result.data??[]).map(row=>({id:row.id,plan:row.plan,cycle:row.cycle,amount:row.amount,state:visiblePaymentState(row.state,row.last_payment_status),createdAt:row.created_at,paidAt:row.paid_at,receiptUrl:`/api/billing/receipts/${row.id}`}))
  }
  return {plan,cycle:active?.invoice?.cycle??null,status:active?(Date.parse(active.period_end)>now?'active':'grace'):(candidates.length?'expired':'free'),periodEnd:active?.period_end??null,
    cancelAtPeriodEnd:prefs?.cancel_at_period_end??false,pendingPlan:prefs?.pending_plan??null,
    usage:{orders:usage.data?.orders_count??0,drivers:drivers.count??0,users:users.count??0},
    limits:{orders:config.ordersPerMonth,drivers:config.drivers,users:config.users},canManageBilling,payments}
}
export async function requireFeature(organizationId:string,feature:'liveSessions'|'dailyBalance',date?:string) {
  const summary=await getSubscriptionSummary(organizationId,'')
  if (!PLANS[summary.plan][feature]) throw new BillingAccessError('FEATURE_UPGRADE_REQUIRED','Cette fonctionnalité est disponible avec les offres Pro et Business.')
  if (feature==='dailyBalance'&&date&&summary.plan==='pro') {
    const earliest=new Date();earliest.setUTCDate(earliest.getUTCDate()-29)
    if(date<earliest.toISOString().slice(0,10)) throw new BillingAccessError('HISTORY_UPGRADE_REQUIRED','L’historique complet est disponible avec Business. Pro inclut les 30 derniers jours.')
  }
}
export async function requireBillingOwner(organizationId:string,userId:string) {
  const db=await createAdminClient()
  const {data,error}=await db.from('organizations').select('owner_id,country').eq('id',organizationId).single()
  fail(error)
  if(!data) throw new Error('BILLING_OWNER_REQUIRED')
  if(data.owner_id!==userId) throw new BillingAccessError('BILLING_OWNER_REQUIRED','Seul le propriétaire peut gérer l’abonnement.',403)
  return data
}
function baseUrl(mode:MonerizMode) {
  const previewOrigin=process.env.VERCEL_ENV==='preview'&&process.env.VERCEL_URL?`https://${process.env.VERCEL_URL}`:undefined
  const url=new URL(process.env.APP_BASE_URL??previewOrigin??'http://localhost:3000')
  if(url.username||url.password||url.search||url.hash||url.pathname!=='/'||(url.protocol!=='https:'&&!(mode==='test'&&['localhost','127.0.0.1'].includes(url.hostname)&&url.protocol==='http:'))) throw new Error('APP_BASE_URL_INVALID')
  return url.origin
}
export async function checkoutSubscription(organizationId:string,userId:string,plan:'pro'|'business',cycle:BillingCycle) {
  const org=await requireBillingOwner(organizationId,userId), db=await createAdminClient(),mode=getMonerizMode()
  if(await runtimeMode(db)!==mode) throw new Error('BILLING_MODE_MISMATCH')
  if(TEST_BILLING_PRICES&&mode!=='test')throw new BillingAccessError('BILLING_TEST_PRICING_MODE','Les tarifs de test sont réservés aux paiements de test. Contactez le support.',503)
  async function prepareInvoice():Promise<BillingInvoice> {
  if(TEST_BILLING_PRICES) {
    return await prepareTestBillingInvoice(db,{organizationId,userId,plan,cycle,amount:TEST_BILLING_PRICES[plan],origin:baseUrl(mode),country:org.country??'CI'},invoiceId=>reconcileBillingInvoice(organizationId,userId,invoiceId))
  } else if(HAS_CUSTOM_BILLING_PRICES) {
    return await preparePricedBillingInvoice(db,{organizationId,userId,mode,plan,cycle,amount:PLANS[plan][cycle],origin:baseUrl(mode),country:org.country??'CI'},invoiceId=>reconcileBillingInvoice(organizationId,userId,invoiceId))
  } else {
    const prepared=await db.rpc('prepare_billing_invoice',{p_org:organizationId,p_user:userId,p_mode:mode,p_plan:plan,p_cycle:cycle,p_origin:baseUrl(mode),p_country:org.country??'CI'})
    fail(prepared.error)
    return prepared.data as BillingInvoice
  }
  }
  let invoice=await prepareInvoice()
  if(invoice.state==='pending'&&invoice.last_payment_status==='failed'&&invoice.checkout_session_id) {
    const checked=await reconcileBillingInvoice(organizationId,userId,invoice.id)
    if(checked.state==='paid')return {invoiceId:invoice.id,checkoutUrl:null,state:'paid'}
    if(checked.state==='expired')invoice=await prepareInvoice()
  }
  if(invoice.state==='paid') return {invoiceId:invoice.id,checkoutUrl:null,state:'paid'}
  if(invoice.checkout_session_id&&invoice.checkout_url) return {invoiceId:invoice.id,checkoutUrl:invoice.checkout_url,state:invoice.state}
  try {
    const session=await createMonerizSession(mode,invoice.idempotency_key,invoice.checkout_request)
    const saved=await db.rpc('save_billing_checkout',{p_invoice:invoice.id,p_session:session})
    fail(saved.error)
    return {invoiceId:invoice.id,checkoutUrl:session.checkoutUrl,state:'pending'}
  } catch(error) {
    const definite=error instanceof MonerizError&&error.definiteFailure
    const result=await db.from('billing_invoices').update({state:definite?'blocked':'pending',last_error:error instanceof MonerizError?error.code:'CHECKOUT_RESULT_UNKNOWN',retry_after:new Date(Date.now()+Math.max(5,error instanceof MonerizError?(error.retryAfter??0):0)*1000).toISOString()})
      .eq('id',invoice.id).eq('state','pending')
    fail(result.error)
    throw error instanceof MonerizError?error:new MonerizError('CHECKOUT_RESULT_UNKNOWN')
  }
}
export async function updateSubscription(organizationId:string,userId:string,action:'cancel'|'resume'|'downgrade',plan?:PlanId) {
  await requireBillingOwner(organizationId,userId)
  const current=await getSubscriptionSummary(organizationId,userId)
  if(action==='downgrade'&&(!plan||plan==='business'||(current.plan!=='business'&&plan==='pro'))) throw new BillingAccessError('INVALID_DOWNGRADE','Choisissez une offre inférieure.',400)
  const db=await createAdminClient()
  const {error}=await db.from('organization_subscriptions').upsert({organization_id:organizationId,cancel_at_period_end:action==='cancel'||(action==='downgrade'&&plan==='discovery'),pending_plan:action==='downgrade'?plan:null,updated_at:new Date().toISOString()},{onConflict:'organization_id'})
  fail(error)
  return getSubscriptionSummary(organizationId,userId)
}
export async function commitMonerizEvent(mode:MonerizMode,event:MonerizEvent) {
  const db=await createAdminClient(),{data,error}=await db.rpc('apply_moneriz_event',{p_mode:mode,p_event:event})
  fail(error)
  return data as string
}
export async function reconcileBillingInvoice(organizationId:string,userId:string,invoiceId:string) {
  await requireBillingOwner(organizationId,userId)
  const db=await createAdminClient(),result=await db.from('billing_invoices').select('*').eq('id',invoiceId).eq('organization_id',organizationId).single()
  if(result.error||!result.data) throw new Error('BILLING_INVOICE_NOT_FOUND')
  const invoice=result.data as BillingInvoice
  if(invoice.state==='reversed') return {state:invoice.state}
  if(!invoice.checkout_session_id) throw new MonerizError('CHECKOUT_RESULT_UNKNOWN')
  const session=await readMonerizSession(invoice.mode,invoice.checkout_session_id)
  if(session.mode!==invoice.mode||session.reference!==invoice.reference||session.amount!==invoice.amount||session.currency!=='XOF'||session.metadata.orderId!==invoice.id||session.metadata.organizationId!==organizationId) throw new Error('BILLING_PAYMENT_MISMATCH')
  let closedWithoutPaidAttempt=!session.paymentId
  if(session.paymentId) {
    const payment=await readMonerizPayment(invoice.mode,session.paymentId)
    closedWithoutPaidAttempt=['failed','expired'].includes(payment.status)
    if(['paid','reversed','failed','expired'].includes(payment.status)) await commitMonerizEvent(invoice.mode,{id:`evt_reconcile_${invoice.mode}_${payment.id}_${payment.status}`,type:payment.status==='paid'?'payment.succeeded':`payment.${payment.status}`,createdAt:invoice.created_at,data:{payment}})
  }
  if(closedWithoutPaidAttempt&&(session.status==='expired'||session.status==='disabled')) {
    const updated=await db.from('billing_invoices').update({state:'expired'}).eq('id',invoice.id).eq('state','pending')
    fail(updated.error)
  }
  const latest=await db.from('billing_invoices').select('state,last_payment_status').eq('id',invoice.id).eq('organization_id',organizationId).single();fail(latest.error)
  if(!latest.data) throw new Error('BILLING_INVOICE_NOT_FOUND')
  return {state:visiblePaymentState(latest.data.state,latest.data.last_payment_status)}
}

export interface BillingReceipt {
  id:string;shop:string;plan:'pro'|'business';cycle:BillingCycle;amount:number;mode:MonerizMode;paidAt:string;periodStart:string;periodEnd:string
}
export async function getBillingReceipt(organizationId:string,userId:string,invoiceId:string):Promise<BillingReceipt|null> {
  await requireBillingOwner(organizationId,userId)
  const db=await createAdminClient()
  const invoice=await db.from('billing_invoices').select('id,plan,cycle,amount,mode,paid_at,state').eq('id',invoiceId).eq('organization_id',organizationId).maybeSingle()
  fail(invoice.error)
  if(!invoice.data||invoice.data.state!=='paid'||!invoice.data.paid_at) return null
  const [org,grant]=await Promise.all([
    db.from('organizations').select('name').eq('id',organizationId).single(),
    db.from('subscription_grants').select('period_start,period_end').eq('invoice_id',invoiceId).eq('organization_id',organizationId).is('revoked_at',null).single(),
  ])
  fail(org.error);fail(grant.error)
  if(!org.data||!grant.data) return null
  return {id:invoice.data.id,shop:org.data.name,plan:invoice.data.plan,cycle:invoice.data.cycle,amount:invoice.data.amount,mode:invoice.data.mode,paidAt:invoice.data.paid_at,periodStart:grant.data.period_start,periodEnd:grant.data.period_end}
}
