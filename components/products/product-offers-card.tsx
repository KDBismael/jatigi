'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import type { ProductOffer } from '@/types/product'

export function ProductOffersCard({ productId, offers, unitCost, onChange }: {
  productId: string; offers: ProductOffer[]; unitCost: number; onChange: () => void
}) {
  const [name, setName] = useState('')
  const [units, setUnits] = useState('')
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createOffer() {
    setBusy(true); setError(null)
    const res = await fetch(`/api/products/${productId}/offers`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, units_per_offer: Number(units), price: Number(price) }) })
    if (!res.ok) { const body = await res.json(); setError(typeof body.error === 'string' ? body.error : 'Offre invalide'); setBusy(false); return }
    setName(''); setUnits(''); setPrice(''); setBusy(false); onChange()
  }

  async function updateOffer(offer: ProductOffer, input: Partial<ProductOffer>) {
    setBusy(true); setError(null)
    const res = await fetch(`/api/products/${productId}/offers/${offer.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
    if (!res.ok) setError((await res.json()).error ?? 'Modification impossible')
    setBusy(false); onChange()
  }

  async function removeOffer(offer: ProductOffer) {
    if (!window.confirm(`Supprimer l’offre « ${offer.name} » ?`)) return
    setBusy(true); setError(null)
    const res = await fetch(`/api/products/${productId}/offers/${offer.id}`, { method: 'DELETE' })
    const body = await res.json()
    if (!res.ok) setError(body.error ?? 'Suppression impossible')
    else if (!body.deleted) window.alert(body.message)
    setBusy(false); onChange()
  }

  function editOffer(offer: ProductOffer) {
    const nextName = window.prompt("Nom de l’offre", offer.name)?.trim()
    if (!nextName) return
    const nextUnits = Number(window.prompt('Unités par offre', String(offer.units_per_offer)))
    const nextPrice = Number(window.prompt("Prix de l’offre (FCFA)", String(offer.price)))
    if (!Number.isInteger(nextUnits) || nextUnits <= 0 || nextPrice <= 0) {
      setError('La quantité et le prix doivent être positifs.'); return
    }
    void updateOffer(offer, { name: nextName, units_per_offer: nextUnits, price: nextPrice })
  }

  return <Card>
    <CardHeader><div><h2 className="font-semibold text-gray-900">Offres / tarifs de vente</h2>
      <p className="mt-0.5 text-xs text-gray-500">Prix commercial fixe pour une quantité donnée. Les anciennes ventes gardent leur tarif.</p></div></CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        {offers.length === 0 && <p className="text-sm text-gray-500">Aucune offre configurée.</p>}
        {offers.map(offer => <div key={offer.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 p-3">
          <div className="min-w-0 flex-1"><p className="font-medium text-gray-900">{offer.name}</p>
            <p className="text-sm text-gray-500">{offer.units_per_offer} unité(s) · {formatCurrency(offer.price)}</p>
            <p className={`text-xs ${offer.price - unitCost * offer.units_per_offer >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Marge estimée : {formatCurrency(offer.price - unitCost * offer.units_per_offer)}
            </p></div>
          <span className={`rounded-full px-2 py-1 text-xs ${offer.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{offer.is_active ? 'Active' : 'Inactive'}</span>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => editOffer(offer)}>Modifier</Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => updateOffer(offer, { is_active: !offer.is_active })}>{offer.is_active ? 'Désactiver' : 'Réactiver'}</Button>
          <Button size="sm" variant="ghost" className="text-red-600" disabled={busy} onClick={() => removeOffer(offer)}>Supprimer</Button>
        </div>)}
      </div>
      <div className="grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-3">
        <Input label="Nom de l’offre" placeholder="Ex : Douzaine promo" value={name} onChange={e => setName(e.target.value)} />
        <Input label="Unités par offre" type="number" min={1} placeholder="12" value={units} onChange={e => setUnits(e.target.value)} />
        <Input label="Prix de l’offre (FCFA)" type="number" min={1} placeholder="18 000" value={price} onChange={e => setPrice(e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button size="sm" disabled={busy || !name || Number(units) <= 0 || Number(price) <= 0} onClick={createOffer}>Ajouter l’offre</Button>
    </CardContent>
  </Card>
}
