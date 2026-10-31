import type { SubscriptionSummary } from '@/lib/billing/plans'
import { formatAmount } from '@/lib/utils'
import styles from './subscription.module.css'
export function SubscriptionUsage({summary}:{summary:SubscriptionSummary}) {
 return <section data-testid="subscription-usage" aria-label="Consommation du mois" className={styles.panel}><div className={styles.sectionHead}><h2>Consommation du mois</h2><span className={styles.muted}>Commandes remises à zéro le 1er</span></div>{(['orders','drivers','users'] as const).map(key=>{
 const value=summary.usage[key], limit=summary.limits[key], warning=key==='orders' && limit!==null && value>=limit-5, percent=limit===null ? 0 : limit>0 ? Math.min(100,value/limit*100) : 100
 const label={orders:'Commandes',drivers:'Livreurs actifs',users:'Utilisateurs'}[key]
 return <div key={key} data-testid={`subscription-usage-${key}`} className={styles.usageItem}><div className={styles.sectionHead}><span>{label}</span><span><b>{formatAmount(value)}</b> / {limit===null?'Illimité':formatAmount(limit)}</span></div><div role="progressbar" aria-label={label} aria-valuenow={limit===null?undefined:Math.max(0,Math.min(value,limit))} aria-valuemax={limit??undefined} aria-valuetext={limit===null?`${value}, Illimité`:`${value} sur ${limit}`} className={styles.track}><div data-tone={warning?'warning':summary.plan==='discovery'?'neutral':'gold'} className={styles.fill} style={{width:limit===null?'100%':`${percent}%`,opacity:limit===null?.25:1}} /></div>{warning && <p className={styles.warningText}>{value>=limit!?'Limite atteinte. Vos commandes existantes restent accessibles.':`Plus que ${limit!-value} commandes disponibles ce mois.`}</p>}</div>
 })}</section>
}
