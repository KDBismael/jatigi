'use client'
import { useId, useState } from 'react'
import type { Order } from '@/types/order'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { calculateDiscount, discountUpdateSchema, type DiscountInput } from '@/lib/discounts'
import { formatDocumentMoney } from '@/lib/order-document'

export const discountOptions = [{ value: 'none', label: 'Aucune remise' }, { value: 'amount', label: 'Montant (FCFA)' }, { value: 'percent', label: 'Pourcentage (%)' }]
export function DiscountEditor({ order, onSaved }: { order: Order; onSaved: (order: Order) => void }) {
  const prefix = useId()
  const [editing, setEditing] = useState(false)
  const [drafts, setDrafts] = useState<(DiscountInput & { id: string })[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lines = order.order_lines ?? []
  const locked = Boolean(order.discounts_locked_at) || order.status === 'delivered' || order.status === 'cancelled'
  function edit() {
    setDrafts(lines.map(line => ({ id: line.id, discount_type: line.discount_type ?? 'none', discount_value: line.discount_value ?? 0, discount_reason: line.discount_reason ?? '' })))
    setError(''); setEditing(true)
  }
  function update(index: number, input: DiscountInput) { setDrafts(current => current.map((draft, i) => i === index ? { ...draft, ...input } : draft)) }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setError('')
    const parsed = discountUpdateSchema.safeParse({ lines: drafts })
    if (!parsed.success) { setError(parsed.error.issues[0].message); return }
    try {
      for (let i = 0; i < lines.length; i++) calculateDiscount(Number(lines[i].line_subtotal ?? lines[i].line_total), drafts[i])
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Remise invalide'); return }
    setBusy(true)
    try {
      const response = await fetch(`/api/orders/${order.id}/discounts`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      onSaved(data); setEditing(false)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Enregistrement impossible') }
    finally { setBusy(false) }
  }
  return <Card><CardHeader><div className="flex items-center justify-between gap-2"><h2 className="font-semibold">Remises par produit</h2>{!editing && !locked && <Button size="sm" variant="secondary" onClick={edit}>Modifier les remises</Button>}</div></CardHeader>
    <CardContent className="space-y-3">
      {locked && <p className="text-sm text-gray-500">Remises verrouillées après livraison ou annulation.</p>}
      {!editing ? lines.map(line => <div key={line.id} className="border-b border-gray-100 pb-3 text-sm">
        <div className="flex justify-between gap-3"><span>{line.product?.name ?? 'Produit'}</span><strong>{formatDocumentMoney(Number(line.line_total))}</strong></div>
        {line.discount_reason && <p className="mt-1 text-gray-500">Remise : {formatDocumentMoney(Number(line.discount_amount ?? 0))} · {line.discount_reason}</p>}
      </div>) : <form onSubmit={save} className="space-y-4"><fieldset disabled={busy || locked} className="space-y-4">
        {drafts.map((draft, index) => <div key={draft.id} className="space-y-2 rounded-lg border border-gray-200 p-3">
          <p className="text-sm font-medium">{lines[index].product?.name ?? 'Produit'} · avant remise : {formatDocumentMoney(Number(lines[index].line_subtotal ?? lines[index].line_total))}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select id={`${prefix}-${index}-type`} label="Type de remise" options={discountOptions} value={draft.discount_type} onChange={event => update(index, { discount_type: event.target.value as DiscountInput['discount_type'], ...(event.target.value === 'none' ? { discount_value: 0, discount_reason: '' } : {}) })} />
            {draft.discount_type !== 'none' && <Input id={`${prefix}-${index}-value`} label={draft.discount_type === 'percent' ? 'Remise (%)' : 'Remise sur la ligne (FCFA)'} type="number" min={0} max={draft.discount_type === 'percent' ? 100 : undefined} step="0.01" value={draft.discount_value} onChange={event => update(index, { discount_value: Number(event.target.value) })} />}
          </div>
          {draft.discount_type !== 'none' && <Input id={`${prefix}-${index}-reason`} label="Motif de la remise" maxLength={300} required={Number(draft.discount_value) > 0} value={draft.discount_reason} onChange={event => update(index, { discount_reason: event.target.value })} />}
        </div>)}
        <div className="flex gap-2"><Button type="submit" disabled={busy || locked}>{busy ? 'Enregistrement…' : 'Enregistrer les remises'}</Button><Button type="button" variant="secondary" onClick={() => setEditing(false)} disabled={busy}>Annuler</Button></div>
      </fieldset></form>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </CardContent>
  </Card>
}
