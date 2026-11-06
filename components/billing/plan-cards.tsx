'use client'
import Link from 'next/link'
import { PLANS, PLAN_IDS, type BillingCycle, type PlanId } from '@/lib/billing/plans'
import { formatAmount } from '@/lib/utils'
import { planFeatures } from '@/lib/billing/plan-presentation'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { SubscriptionActionButton } from './subscription-action-button'
import styles from './subscription.module.css'
export function PlanCards({cycle='monthly', current, onChoose, busy=false, publicPage=false}: {cycle?:BillingCycle;current?:PlanId;onChoose?:(plan:'pro'|'business',cycle:BillingCycle)=>void;busy?:boolean;publicPage?:boolean}) {
 const paid = !!current && current !== 'discovery'
 return <div className={styles.stack}><div className={styles.plans}>{PLAN_IDS.map((id) => {
  const plan=PLANS[id], selected=current===id, lower=!!current && PLAN_IDS.indexOf(id)<PLAN_IDS.indexOf(current)
  const compare = 'launchCompareAt' in plan ? plan.launchCompareAt[cycle] : null
  return <section key={id} data-testid={`subscription-plan-${id}`} className={`${styles.plan} ${selected ? paid ? styles.selectedPaid : styles.selectedFree : ''}`}>
   <Card className={styles.planSurface}>
    {selected && <div className={`${styles.currentBand} ${paid ? styles.paidBand : ''}`}>Votre plan actuel</div>}
    <div className={styles.planBody}>
     <div className={styles.planTitle}><h3>{plan.name}</h3><div className={styles.price}>{compare && <s>{formatAmount(compare)}</s>} <strong>{formatAmount(plan[cycle])}</strong><span>FCFA/{cycle==='yearly'?'an':'mois'}</span></div></div>
     {cycle==='yearly' && plan.monthly*12>plan.yearly && <p className={styles.savings}>Économisez {formatAmount(plan.monthly*12-plan.yearly)} FCFA par an</p>}
     <ul className={styles.features}>{planFeatures(id).map(feature=><li key={feature}><Icon name="check"/><span>{feature}</span></li>)}</ul>
     <div className={styles.planFooter}>{publicPage ? <Link href="/auth/signup" className={styles.publicCta}>Essayer gratuitement</Link> : lower ? <p className={styles.lowerNote}>Disponible à l’échéance, dans la gestion de votre abonnement.</p> : id!=='discovery' && onChoose ? <SubscriptionActionButton data-testid={`subscription-choose-${id}`} disabled={busy} tone={selected?'dark':paid?'gold':'neutral'} onClick={()=>onChoose(id,cycle)}>{selected?'Renouveler':'Passer à'} {plan.name}</SubscriptionActionButton> : null}</div>
    </div>
   </Card>
  </section>
 })}</div><p className={styles.muted}>Sessions live, catalogue, stock et dépenses inclus dans tous les plans.</p></div>
}
