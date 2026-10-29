'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {Card,CardContent,CardHeader} from '@/components/ui/card'
interface Movement{id:string;lot_id:string;order_id:string|null;quantity_delta:number;reason:'receipt'|'sale'|'return'|'adjustment';occurred_at:string|null;reconstructed:boolean;variant:{name:string}|null;recorder:{full_name:string}|null}
const labels={receipt:'Entrée de stock',sale:'Commande',return:'Retour en stock',adjustment:'Ajustement'}
export function StockMovementsCard({productId,refresh}:{productId:string;refresh?:string}){
 const[rows,setRows]=useState<Movement[]>([]);const[error,setError]=useState('')
 useEffect(()=>{let active=true;fetch(`/api/products/${productId}/movements`).then(async r=>{if(!r.ok)throw new Error();return r.json()}).then(data=>{if(active){setRows(data);setError('')}}).catch(()=>{if(active)setError('Historique indisponible')});return()=>{active=false}},[productId,refresh])
 return <Card><CardHeader><h2 className="font-semibold">Mouvements de stock</h2><p className="text-xs text-gray-500">Les anciennes entrées et ventes proviennent des lots et allocations FIFO conservés. Les ajustements antérieurs au journal ne sont pas reconstituables.</p></CardHeader><CardContent>{error&&<p role="alert">{error}</p>}<ul className="divide-y">{rows.map(row=><li key={row.id} className="py-3 flex justify-between gap-3 text-sm"><div><p>{labels[row.reason]}{row.variant?` · ${row.variant.name}`:''} · Lot {row.lot_id.slice(0,8)}</p><p className="text-xs text-gray-500">{row.occurred_at?new Date(row.occurred_at).toLocaleString('fr-FR'):'Date historique non documentée'} · {row.recorder?.full_name??(row.reconstructed?'Historique reconstitué':'Utilisateur archivé')}</p>{row.order_id&&<Link className="text-indigo-700" href={`/orders/${row.order_id}`}>Commande {row.order_id.slice(0,8)}</Link>}</div><strong className={row.quantity_delta>0?'text-green-700':'text-red-700'}>{row.quantity_delta>0?'+':''}{row.quantity_delta}</strong></li>)}</ul>{rows.length===0&&!error&&<p className="text-sm text-gray-500">Aucun mouvement.</p>}</CardContent></Card>
}
