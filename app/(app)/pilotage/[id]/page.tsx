'use client'
import { Icon } from '@/components/ui/icon'
import {useEffect,useState,useRef} from 'react'
import {useParams} from 'next/navigation'
import Link from 'next/link'
import {OrderForm} from '@/components/orders/order-form'
import {useProducts} from '@/hooks/use-products'
import {useDeliveryDrivers} from '@/hooks/use-delivery-drivers'
import {useOrderOptions} from '@/hooks/use-order-options'
import {useOrders} from '@/hooks/use-orders'
import {useProductStore} from '@/stores/product-store'
import {Button} from '@/components/ui/button'
import {formatCurrency} from '@/lib/utils'
import {orderTotal} from '@/lib/order-amounts'
import type {LiveSession} from '@/types/pilotage'
import type {OrderInput} from '@/lib/schemas/order.schema'
export default function LiveCapturePage(){
 const {id}=useParams<{id:string}>();const[live,setLive]=useState<LiveSession|null>(null);const[error,setError]=useState('');const[busy,setBusy]=useState(false);const[count,setCount]=useState(0);const saving=useRef(false)
 const{products}=useProducts();const{drivers}=useDeliveryDrivers();const{sellers}=useOrderOptions();const{allOrders,create}=useOrders();const setProducts=useProductStore(s=>s.setProducts)
 useEffect(()=>{fetch('/api/lives').then(async r=>{if(!r.ok)throw new Error('Session inaccessible');return r.json()}).then(data=>{const session=data.find((l:LiveSession)=>l.id===id);if(!session)throw new Error('Session introuvable');setLive(session)}).catch(e=>setError(e.message))},[id])
 async function transition(status:'active'|'completed') {if(!live)return;setBusy(true);setError('');try{const r=await fetch('/api/lives',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...live,status})});const data=await r.json();if(!r.ok)throw new Error(data.error);setLive(data)}catch(e){setError(e instanceof Error?e.message:'Erreur')}finally{setBusy(false)}}
 async function capture(input:OrderInput){if(saving.current||live?.status!=='active')return;saving.current=true;setBusy(true);setError('');try{await create({...input,live_session_id:id});const r=await fetch('/api/products');if(r.ok)setProducts(await r.json());setCount(x=>x+1)}catch(e){setError(e instanceof Error?e.message:'Commande impossible')}finally{saving.current=false;setBusy(false)}}
 const orders=allOrders.filter(o=>o.live_session_id===id)
 const revenue=orders.filter(o=>!['cancelled','returned'].includes(o.status)).reduce((sum,o)=>sum+orderTotal(o.order_lines??[]),0)
 return <div className="space-y-6"><Link href="/pilotage" className="text-indigo-700"><Icon name="chevron-left" className="inline-block h-4 w-4" /> Sessions</Link><h1 className="text-2xl font-bold">{live?.name??'Session live'}</h1>{error&&<p role="alert" className="bg-red-50 p-3 text-red-700">{error}</p>}{live&&<><p>{live.session_date} · {live.status==='active'?'En direct':live.status==='planned'?'Planifiée':live.status==='completed'?'Clôturée':'Annulée'}</p><div className="rounded-xl border bg-white p-4 flex gap-8"><p>Commandes : <strong>{orders.length}</strong></p><p>Montant hors annulations et retours : <strong>{formatCurrency(revenue)}</strong></p></div>{live.status==='planned'&&<Button disabled={busy} onClick={()=>transition('active')}>Démarrer le live</Button>}{live.status==='active'&&<><Button variant="secondary" disabled={busy} onClick={()=>transition('completed')}>Clôturer le live</Button><h2 className="text-lg font-semibold">Saisie rapide des commandes</h2><OrderForm key={count} initialLiveSessionId={id} products={products} drivers={drivers} sellers={sellers} lives={[live]} isLoading={busy} onSubmit={capture}/></>}<h2 className="text-lg font-semibold">Récapitulatif de session</h2><ul className="divide-y rounded-xl border bg-white p-4">{orders.map(o=><li key={o.id} className="py-2 flex justify-between"><Link className="text-indigo-700" href={`/orders/${o.id}`}>{o.client_name}</Link><span>{formatCurrency(orderTotal(o.order_lines??[]))}</span></li>)}</ul></>}</div>
}
