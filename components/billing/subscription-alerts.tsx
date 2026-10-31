import { PLANS, type BillingCycle, type SubscriptionSummary } from '@/lib/billing/plans'
import { formatAmount } from '@/lib/utils'
import { SubscriptionActionButton } from './subscription-action-button'
import styles from './subscription.module.css'
export function SubscriptionAlerts({summary,busy,onCheckout,onResume}:{summary:SubscriptionSummary;busy:boolean;onCheckout:(plan:'pro'|'business',cycle:BillingCycle)=>void;onResume:()=>void}) {
 if(!summary.canManageBilling) return null
 return <>{summary.status==='grace' && summary.plan!=='discovery' && <div data-testid="subscription-grace-alert" role="alert" className={styles.alert}><div><strong>Votre abonnement est arrivé à échéance.</strong><p>Confirmez votre paiement pour conserver vos avantages.</p></div><SubscriptionActionButton data-testid="subscription-grace-pay" tone="gold" disabled={busy} onClick={()=>onCheckout(summary.plan as 'pro'|'business',summary.cycle??'monthly')}>Payer {formatAmount(PLANS[summary.plan][summary.cycle??'monthly'])} FCFA</SubscriptionActionButton></div>}{summary.cancelAtPeriodEnd && summary.status==='active' && summary.plan!=='discovery' && <div data-testid="subscription-cancel-notice" role="status" className={styles.notice}><div><strong>Arrêt prévu à la fin de votre période.</strong><p>Vous conservez {PLANS[summary.plan].name} jusqu’à l’échéance.</p></div><SubscriptionActionButton data-testid="subscription-resume" tone="outline" disabled={busy} onClick={onResume}>Conserver {PLANS[summary.plan].name}</SubscriptionActionButton></div>}</>
}
