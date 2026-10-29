'use client'
import Image from 'next/image'
import {useState} from 'react'
import {Card,CardContent,CardHeader} from '@/components/ui/card'
import {Button} from '@/components/ui/button'
export function ProductImagesCard({productId,images,onChange}:{productId:string;images:{id:string}[];onChange:()=>void}){
 const[busy,setBusy]=useState(false);const[error,setError]=useState('')
 async function upload(file:File){setBusy(true);setError('');try{const body=new FormData();body.set('file',file);const r=await fetch(`/api/products/${productId}/images`,{method:'POST',body});if(!r.ok)throw new Error((await r.json()).error);onChange()}catch(e){setError(e instanceof Error?e.message:'Envoi impossible')}finally{setBusy(false)}}
 async function remove(id:string){setBusy(true);setError('');try{const r=await fetch(`/api/products/${productId}/images?image=${id}`,{method:'DELETE'});if(!r.ok)throw new Error((await r.json()).error);onChange()}catch(e){setError(e instanceof Error?e.message:'Suppression impossible')}finally{setBusy(false)}}
 return <Card><CardHeader><h2 className="font-semibold">Images du produit</h2></CardHeader><CardContent className="space-y-4"><label className="block text-sm">Ajouter une image PNG ou JPEG (2 Mo maximum)<input className="mt-2 block" aria-label="Image du produit" type="file" accept="image/png,image/jpeg" disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);e.target.value=''}}/></label>{error&&<p role="alert" className="text-red-600">{error}</p>}<div className="flex flex-wrap gap-4">{images.map(image=><div key={image.id} className="space-y-2"><Image unoptimized width={128} height={128} src={`/api/products/${productId}/images?image=${image.id}`} alt="Produit" className="w-32 h-32 rounded-lg object-cover"/><Button size="sm" variant="ghost" disabled={busy} onClick={()=>remove(image.id)}>Supprimer l’image</Button></div>)}</div></CardContent></Card>
}
