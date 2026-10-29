import { createAdminClient } from '@/services/supabase/server'
import { getSubscriptionSummary } from '@/services/billing-service'
import { PLANS } from '@/lib/billing/plans'

/** No off-session charges: the owner completes a fresh hosted payment to renew. */
export async function processBillingLifecycle(now = new Date()) {
  const db = await createAdminClient()
  let queued=0
  for(let offset=0;;offset+=200) {
    const {data,error}=await db.from('organizations').select('id,owner_id').not('owner_id','is',null).order('id').range(offset,offset+199)
    if(error) throw new Error(error.message)
    for(const org of data??[]) {
      const summary=await getSubscriptionSummary(org.id,org.owner_id)
      if(!summary.periodEnd||summary.plan==='discovery'||summary.cancelAtPeriodEnd||summary.pendingPlan==='discovery') continue
      const end=Date.parse(summary.periodEnd),delta=end-now.getTime()
      if(delta>3*86400000||delta<=-3*86400000) continue
      // A paid future grant means renewal is already covered; do not ask for another payment.
      const future=await db.from('subscription_grants').select('id,invoice_id,invoice:billing_invoices(mode)').eq('organization_id',org.id).is('revoked_at',null).gte('period_start',summary.periodEnd).gt('period_end',summary.periodEnd).limit(1)
      if(future.error) throw new Error(future.error.message)
      const mode=await db.from('billing_settings').select('mode').eq('singleton',true).single()
      if(mode.error)throw new Error(mode.error.message)
      if((future.data??[]).some((g:{invoice_id:string|null;invoice:unknown})=>!g.invoice_id||(g.invoice as {mode:string}|null)?.mode===mode.data?.mode)) continue
      const kind=delta>0?'renewal_due':'grace_reminder',day=delta>0?0:Math.floor(-delta/86400000)
      const plan=summary.pendingPlan==='pro'?'pro':summary.plan,cycle=summary.cycle??'monthly'
      const {error:writeError}=await db.from('notification_jobs').upsert({organization_id:org.id,recipient_user_id:org.owner_id,kind,channel:'email',dedupe_key:`${kind}:${org.id}:${summary.periodEnd}:${day}`,payload:{plan,amount:PLANS[plan][cycle],periodEnd:summary.periodEnd},available_at:now.toISOString()},{onConflict:'dedupe_key',ignoreDuplicates:true})
      if(writeError) throw new Error(writeError.message)
      queued++
    }
    if(!data||data.length<200) break
  }
  return {queued}
}
