'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth-store'
import { ProductForm } from '@/components/products/product-form'
import { OrderForm } from '@/components/orders/order-form'
import { useProducts } from '@/hooks/use-products'
import { useDeliveryDrivers } from '@/hooks/use-delivery-drivers'
import { useOrders } from '@/hooks/use-orders'
import { useOrderOptions } from '@/hooks/use-order-options'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { OnboardingProgress } from '@/lib/onboarding'

export function OnboardingWizard() {
  const { profile } = useAuthStore()
  if (!profile) return <p>Chargement...</p>
  if (profile.role !== 'admin') return <p>Configuration réservée à l’administrateur de la boutique.</p>
  return <Wizard />
}
function Wizard() {
  const [progress,setProgress]=useState<OnboardingProgress|null>(null)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [driverName,setDriverName]=useState('')
  const [driverPhone,setDriverPhone]=useState('')
  const lock=useRef(false)
  const {products,create:createProduct}=useProducts()
  const {drivers,create:createDriver}=useDeliveryDrivers()
  const {create:createOrder}=useOrders()
  const {sellers,lives}=useOrderOptions()
  const load=useCallback(async()=>{
    const response=await fetch('/api/onboarding')
    if(!response.ok) throw new Error('Impossible de charger la configuration')
    const state=await response.json();setProgress(state);return state as OnboardingProgress
  },[])
  useEffect(()=>{void Promise.resolve().then(load).catch(error=>setError(error.message))},[load])
  async function saveStep(step:number,skipped_steps?:number[]) {
    const response=await fetch('/api/onboarding',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({step,...(skipped_steps?{skipped_steps}:{})})})
    if(!response.ok) throw new Error('Impossible d’enregistrer votre progression')
    setProgress(await response.json())
  }
  async function act(action:()=>Promise<unknown>) {
    if(lock.current)return
    lock.current=true;setBusy(true);setError('')
    try {await action()} catch(error) {setError(error instanceof Error?error.message:'Une erreur est survenue')} finally {lock.current=false;setBusy(false)}
  }
  const step=progress?.step??1
  const labels=['Ajouter un produit','Ajouter un livreur','Créer une commande']
  if(progress?.complete) return <div className="space-y-4"><h1 className="text-2xl font-bold">Votre boutique est prête !</h1><p>Votre produit, votre livreur et votre commande sont enregistrés.</p><Link href="/dashboard" className="text-indigo-600">Ouvrir mon tableau de bord →</Link></div>
  return <div className="max-w-2xl space-y-6"><div><h1 className="text-2xl font-bold">Bienvenue dans votre boutique</h1><p className="text-sm text-gray-500 mt-2">Trois actions pour démarrer. Chaque élément créé reste disponible dans votre boutique.</p></div>
    <nav aria-label="Étapes de configuration" className="flex flex-wrap gap-2">{labels.map((label,index)=><Button key={label} size="sm" variant={step===index+1?'primary':'secondary'} disabled={busy||!progress} onClick={()=>void act(()=>saveStep(index+1))}>{index+1}. {label}</Button>)}</nav>
    {error&&<p role="alert" className="bg-red-50 text-red-600 rounded p-3">{error}</p>}
    {!progress?<div><p>Chargement de la configuration...</p>{error&&<Button onClick={()=>void act(load)}>Réessayer</Button>}</div>:<>
      <h2 className="font-semibold">Étape {step} / 3 — {labels[step-1]}</h2>
      {step===1&&<ProductForm isLoading={busy} onSubmit={data=>act(async()=>{await createProduct(data);await saveStep(2)})}/>}
      {step===2&&<form onSubmit={event=>{event.preventDefault();void act(async()=>{await createDriver({name:driverName,phone:driverPhone});await saveStep(3)})}} className="space-y-4"><Input id="first-driver-name" label="Nom du livreur" required maxLength={120} value={driverName} onChange={event=>setDriverName(event.target.value)}/><Input id="first-driver-phone" label="Téléphone du livreur (optionnel)" type="tel" maxLength={30} value={driverPhone} onChange={event=>setDriverPhone(event.target.value)}/><Button type="submit" disabled={busy}>{busy?'Enregistrement...':'Ajouter mon livreur'}</Button></form>}
      {step===3&&<><p className="text-sm text-gray-500">Créez une vraie commande client avec le produit et le livreur ajoutés. Vous pourrez la retrouver dans Commandes.</p>{products.length===0?<p className="text-sm">Ajoutez d’abord un produit à l’étape 1 pour créer une commande.</p>:<OrderForm products={products} drivers={drivers} sellers={sellers} lives={lives} isLoading={busy} onSubmit={data=>act(async()=>{await createOrder(data);await load()})}/>}</>}
      <div className="flex flex-wrap items-center gap-4"><Button variant="secondary" disabled={busy} onClick={()=>void act(()=>saveStep(step===3?1:step+1,[...new Set([...progress.skipped_steps,step])]))}>Sauter cette étape</Button><Link href="/dashboard" className="text-sm text-indigo-600">Continuer plus tard</Link></div>
    </>}
  </div>
}
