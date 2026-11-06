'use client'
import { TEST_BILLING_PRICES } from '@/lib/billing/test-pricing'
import { useState } from 'react'
import { PLANS, ANNUAL_SAVING_PERCENT, type BillingCycle, type SubscriptionSummary, type PlanId } from '@/lib/billing/plans'
import { formatAmount } from '@/lib/utils'
import type { BillingIntent } from '@/lib/billing/intent'
import { planFeatures } from '@/lib/billing/plan-presentation'
import { Icon } from '@/components/ui/icon'
import { PlanCards } from './plan-cards'
import { SubscriptionMemberCard } from './subscription-member-card'
import { SubscriptionUsage } from './subscription-usage'
import { SubscriptionAlerts } from './subscription-alerts'
import { SubscriptionManagement } from './subscription-management'
import { SubscriptionPayments } from './subscription-payments'
import { SubscriptionActionButton } from './subscription-action-button'
import styles from './subscription.module.css'
export function SubscriptionView({summary,onCheckout,onAction,onReconcile,busy,selectedIntent}:{selectedIntent?:BillingIntent|null;summary:SubscriptionSummary;onCheckout:(plan:'pro'|'business',cycle:BillingCycle)=>void;onAction:(action:'cancel'|'resume'|'downgrade',plan?:PlanId)=>void;onReconcile?:(invoiceId:string)=>void;busy:boolean}) {
 const intent = summary.canManageBilling && summary.plan === 'discovery' && summary.status === 'free' ? selectedIntent : null
 const [cycle,setCycle]=useState<BillingCycle>(intent?.cycle ?? summary.cycle ?? 'monthly')
 return <div className={styles.stack}>
 <>{intent && <p className={styles.notice} data-testid="subscription-selected-intent">Votre choix avant inscription : {PLANS[intent.plan].name} · {formatAmount(PLANS[intent.plan][intent.cycle])} FCFA / {intent.cycle === 'yearly' ? 'an' : 'mois'}. Aucun paiement effectué. Choisissez une offre ci-dessous pour vérifier puis confirmer son paiement.</p>}</>
 <SubscriptionAlerts summary={summary} busy={busy} onCheckout={onCheckout} onResume={()=>onAction('resume')}/>
 <div className={styles.hero}><SubscriptionMemberCard summary={summary} busy={busy} onCheckout={onCheckout}/><SubscriptionUsage summary={summary}/></div>
 {summary.plan!=='discovery' && <section data-testid="subscription-benefits" className={`${styles.panel} ${styles.benefits}`}><h2>Inclus dans votre plan {PLANS[summary.plan].name}</h2><ul className={styles.benefitList}>{planFeatures(summary.plan).map(feature=><li key={feature}><Icon name="check"/>{feature}</li>)}</ul></section>}
 <section data-testid="subscription-plans" className={styles.stack}><div className={styles.sectionHead}><h2>Changer de plan</h2><div role="group" aria-label="Période de facturation" className={styles.cycle}>{(['monthly','yearly'] as const).map(value=><SubscriptionActionButton key={value} data-testid={`subscription-cycle-${value}`} aria-pressed={cycle===value} onClick={()=>setCycle(value)}>{value==='monthly'?'Mensuel':'Annuel'}{value==='yearly' && !TEST_BILLING_PRICES && ANNUAL_SAVING_PERCENT>0 && <span className={styles.annualSaving}>{ANNUAL_SAVING_PERCENT} % d’économie</span>}</SubscriptionActionButton>)}</div></div>
 <PlanCards cycle={cycle} current={summary.plan} onChoose={summary.canManageBilling?onCheckout:undefined} busy={busy}/>
 {!summary.canManageBilling && <p className={styles.notice}>Seul le propriétaire peut gérer l’abonnement.</p>}
 <p className={styles.muted}>Le renouvellement nécessite un paiement confirmé à chaque échéance. Paiement sécurisé sur la page de notre prestataire : Mobile Money en priorité, carte selon disponibilité. L’activation attend la confirmation du paiement.</p>
 </section>
 <SubscriptionManagement summary={summary} busy={busy} onAction={onAction}/><SubscriptionPayments summary={summary} busy={busy} onReconcile={onReconcile} onCheckout={onCheckout}/>
 </div>
}
