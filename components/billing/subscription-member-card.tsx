import { PLANS, type BillingCycle, type SubscriptionSummary } from '@/lib/billing/plans'
import { useAuthStore } from '@/stores/auth-store'
import { formatAmount } from '@/lib/utils'
import { Icon } from '@/components/ui/icon'
import { SubscriptionActionButton } from './subscription-action-button'
import styles from './subscription.module.css'
export function SubscriptionMemberCard({summary,busy,onCheckout}:{summary:SubscriptionSummary;busy:boolean;onCheckout:(plan:'pro'|'business',cycle:BillingCycle)=>void}) {
 const organization=useAuthStore(s=>s.organization)
 const paid=summary.plan!=='discovery', cycle=summary.cycle??'monthly', plan=PLANS[summary.plan]
 const latest=[...summary.payments].filter(p=>p.state==='paid').sort((a,b)=>Date.parse(b.paidAt??b.createdAt)-Date.parse(a.paidAt??a.createdAt))[0]
 const cancellationScheduled=paid && summary.status==='active' && summary.cancelAtPeriodEnd
 const status=cancellationScheduled?'Arrêt prévu':{free:'Gratuit',active:'Actif',grace:'Délai de grâce',expired:'Expiré'}[summary.status]
 return <section data-testid="subscription-current-plan" data-paid={paid} aria-label="Votre plan actuel" className={`${styles.panel} ${paid?styles.member:''}`}><div className={styles.sectionHead}><div><p className={styles.eyebrow}>{paid?'Warko':'Votre plan'}</p><h2 className={paid?styles.foil:styles.freeName}>{plan.name}</h2></div><span className={styles.memberStatus}>{status}</span></div>
 {paid ? <dl className={styles.memberDetails}><div><dt>Boutique</dt><dd>{organization?.name??'Votre boutique'}</dd></div><div><dt>Facturation</dt><dd>{cycle==='monthly'?'Mensuelle':'Annuelle'}</dd></div><div><dt>{summary.status==='expired'?'Période terminée le':summary.status==='grace'?'Échéance dépassée':cancellationScheduled?'Se termine le':'Prochain renouvellement'}</dt><dd>{summary.periodEnd?new Date(summary.periodEnd).toLocaleDateString('fr-FR'):'Date non disponible'}</dd></div><div><dt>Prochain paiement</dt><dd>{formatAmount(plan[cycle])} FCFA/{cycle==='monthly'?'mois':'an'}</dd></div></dl>:<p className={styles.muted}>Un deuxième livreur ou plus de {PLANS.discovery.ordersPerMonth} commandes par mois ? Pro vous accompagne avec le bilan détaillé par livreur et l’export.</p>}
 {summary.pendingPlan && <p>Prochain plan : {PLANS[summary.pendingPlan].name}</p>}
 {summary.canManageBilling && <div className={styles.actions}>{summary.plan!=='business' && <SubscriptionActionButton data-testid={`subscription-upgrade-${paid?'business':'pro'}`} tone="gold" disabled={busy} onClick={()=>onCheckout(paid?'business':'pro',cycle)}>{paid?'Passer à Business':`Passer à Pro · ${formatAmount(PLANS.pro.monthly)} FCFA/mois`}</SubscriptionActionButton>}{paid && latest && <a data-testid="subscription-receipt-latest" className={styles.receiptLatest} href={latest.receiptUrl}><Icon name="receipt"/>Dernier reçu PDF</a>}</div>}
 </section>
}
