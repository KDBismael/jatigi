'use client'
import { useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { SHOP_COUNTRIES } from '@/lib/onboarding'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { Organization } from '@/types/user'

export function ShopSettings() {
  const { organization, profile, setOrganization } = useAuthStore()
  if (!organization || profile?.role !== 'admin') return null
  return <SettingsForm key={organization.id} organization={organization} onSave={setOrganization} />
}
function SettingsForm({organization,onSave}:{organization:Organization;onSave:(value:Organization)=>void}) {
  const [name,setName]=useState(organization.name)
  const [country,setCountry]=useState(organization.country ?? 'CI')
  const [fee,setFee]=useState(String(organization.default_delivery_fee ?? 0))
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  async function save(event:React.FormEvent) {
    event.preventDefault();setBusy(true);setMessage('')
    try {
      const response=await fetch('/api/organization/settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,country,currency:'XOF',default_delivery_fee:Number(fee)})})
      const payload=await response.json()
      if(!response.ok) throw new Error(payload.error ?? 'Modification impossible')
      onSave(payload);setMessage('Paramètres enregistrés.')
    } catch(error) {setMessage(error instanceof Error?error.message:'Modification impossible')} finally {setBusy(false)}
  }
  return <Card><CardHeader><h2 className="font-semibold">Paramètres de la boutique</h2></CardHeader><CardContent><form onSubmit={save} className="space-y-4"><Input id="shop-name" label="Nom de la boutique" required maxLength={120} value={name} onChange={event=>setName(event.target.value)}/><Select id="shop-country" label="Pays" options={[...SHOP_COUNTRIES]} value={country} onChange={event=>setCountry(event.target.value as typeof country)}/><Input id="shop-currency" label="Devise" value="XOF (FCFA)" readOnly/><Input id="shop-delivery-fee" label="Frais de livraison par défaut (FCFA)" type="number" min={0} step="0.01" required value={fee} onChange={event=>setFee(event.target.value)}/>{message&&<p role="status" className="text-sm">{message}</p>}<Button type="submit" disabled={busy}>{busy?'Enregistrement...':'Enregistrer les paramètres'}</Button></form></CardContent></Card>
}
