import type {DeliveryDayReport} from '@/types/delivery-balance'
export function deliveryBalanceCsv(report:DeliveryDayReport) {
 const rows:unknown[][]=[['Date de tournée','Livreur','Livrées','En livraison','Annulées / retournées','Reportées','Encaissé sur la tournée','Frais retenus','À remettre attendu','Reversé à cette date','Reste dû global actuel'],...report.drivers.map(d=>[report.date,d.driverName,d.counts.delivered,d.counts.in_progress,d.counts.cancelled,d.counts.postponed,d.amountCollected??'Non documenté',d.deliveryFees??'Non documenté',d.expectedRemittance,d.remittedOnDate??0,d.globalAmountDue??0])]
 const cell=(value:unknown)=>{let s=String(value??'');if(typeof value==='string'&&/^[\s]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
 return '\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n')
}
