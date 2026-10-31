import { PLANS, type SubscriptionSummary } from '@/lib/billing/plans'
import { formatAmount } from '@/lib/utils'
import { SubscriptionActionButton } from './subscription-action-button'
import styles from './subscription.module.css'
const states:Record<string,string>={pending:'En attente',paid:'Payé',blocked:'Bloqué',expired:'Expiré',reversed:'Annulé / remboursé'}
export function SubscriptionPayments({summary,busy,onReconcile}:{summary:SubscriptionSummary;busy:boolean;onReconcile?:(id:string)=>void}) {
 if(!summary.canManageBilling) return null
 return <section data-testid="subscription-payments" className={styles.panel}><h2>Historique des paiements</h2>{summary.payments.length===0?<p className={styles.muted}>Aucun paiement pour le moment.</p>:<table className={styles.payments}><thead><tr><th>Date</th><th>Plan</th><th>Montant</th><th>État</th><th>Reçu</th></tr></thead><tbody>{summary.payments.map(payment=><tr key={payment.id} data-testid="subscription-payment-row"><td data-label="Date">{new Date(payment.createdAt).toLocaleDateString('fr-FR')}</td><td data-label="Plan">{PLANS[payment.plan].name}</td><td data-label="Montant">{formatAmount(payment.amount)} FCFA</td><td data-label="État"><span className={styles.paymentState} data-state={payment.state}>{states[payment.state]??payment.state}</span></td><td>{payment.state==='paid'?<a data-testid="subscription-receipt" data-paid={summary.plan!=='discovery'} className={styles.receipt} href={payment.receiptUrl}>Reçu PDF</a>:payment.state==='pending' && onReconcile?<SubscriptionActionButton data-testid="subscription-reconcile" disabled={busy} onClick={()=>onReconcile(payment.id)}>Vérifier ce paiement</SubscriptionActionButton>:null}</td></tr>)}</tbody></table>}</section>
}
