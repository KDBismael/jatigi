'use client'
import {useState} from 'react'
import {Input} from '@/components/ui/input'
import {Button} from '@/components/ui/button'
import {Card,CardContent,CardHeader} from '@/components/ui/card'
import type {ProductVariant} from '@/types/product'
export function ProductVariantsCard({productId,variants,onChange}:{productId:string;variants:ProductVariant[];onChange:()=>void}){
 const[name,setName]=useState('');const[error,setError]=useState('');const[busy,setBusy]=useState(false)
 async function save(input:{name:string;id?:string;is_active?:boolean}){setBusy(true);setError('');try{const r=await fetch(`/api/products/${productId}/variants`,{method:input.id?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});const b=await r.json();if(!r.ok)throw new Error(b.error);setName('');onChange()}catch(e){setError(e instanceof Error?e.message:'Erreur')}finally{setBusy(false)}}
 return <Card><CardHeader><h2 className="font-semibold">Variantes et stock</h2></CardHeader><CardContent className="space-y-4"><p className="text-sm text-gray-500">Créez les tailles ou couleurs, puis ajoutez un lot en sélectionnant sa variante. Chaque variante possède ses propres lots FIFO ; le stock sans variante reste séparé.</p>{error&&<p role="alert" className="text-red-600">{error}</p>}<div className="flex gap-2"><Input label="Nom de variante" placeholder="Bleu / L" value={name} onChange={e=>setName(e.target.value)}/><Button disabled={busy||!name.trim()} onClick={()=>save({name})}>Ajouter</Button></div><ul className="divide-y">{variants.map(v=><li key={v.id} className="py-3 flex justify-between items-center"><span>{v.name} · {v.stock_quantity} en stock{!v.is_active?' · Archivée':''}</span><div><Button size="sm" variant="ghost" disabled={busy} onClick={()=>{const n=window.prompt('Nom de variante',v.name);if(n?.trim())void save({id:v.id,name:n})}}>Renommer</Button><Button size="sm" variant="ghost" disabled={busy} onClick={()=>save({id:v.id,name:v.name,is_active:!v.is_active})}>{v.is_active?'Archiver':'Restaurer'}</Button></div></li>)}</ul></CardContent></Card>
}
