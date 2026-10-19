'use client'

import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { STATUSES, STATUS_LABELS } from '@/lib/constants'
import { downloadCustomerExport, type CustomerExportReport } from '@/lib/customer-export'

export function CustomerExport({ product }: { product?: { id: string; name: string } }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [products, setProducts] = useState<{ id: string; name: string; is_active: boolean }[]>([])
  const [productId, setProductId] = useState(product?.id ?? '')
  const [status, setStatus] = useState('delivered')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState<CustomerExportReport | null>(null)

  async function toggle() {
    setOpen(!open)
    if (open || product || products.length) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/products')
      if (!response.ok) throw new Error('Impossible de charger les produits. Fermez puis réessayez.')
      setProducts(await response.json())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Chargement impossible')
    } finally { setBusy(false) }
  }

  async function prepare(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setReport(null)
    try {
      const params = new URLSearchParams({ status })
      if (productId) params.set('productId', productId)
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const response = await fetch(`/api/customers/export?${params}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Export impossible')
      setReport(data)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Export impossible')
    } finally { setBusy(false) }
  }

  async function download(format: 'csv' | 'xlsx') {
    if (!report) return
    setBusy(true)
    setError('')
    try { await downloadCustomerExport(report, format) }
    catch { setError('Le téléchargement a échoué. Réessayez.') }
    finally { setBusy(false) }
  }

  return <section className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
    <Button variant="secondary" size="sm" onClick={toggle} disabled={busy} aria-expanded={open} aria-controls={`${id}-panel`}>
      {open ? 'Fermer l’export clients' : 'Exporter les clients'}
    </Button>
    {open && <div id={`${id}-panel`} className="mt-4 space-y-4">
      <div>
        <h2 className="font-semibold text-gray-900">{product ? `Clients du produit : ${product.name}` : 'Exporter les clients'}</h2>
        <p className="mt-1 text-sm text-gray-500">Une ligne par téléphone. Par défaut : commandes livrées, tout l’historique. Les dates portent sur la commande.</p>
      </div>
      <form onSubmit={prepare}>
        <fieldset disabled={busy} onChange={() => { setReport(null); setError('') }} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {!product && <Select id={`${id}-product`} label="Produit" value={productId} onChange={event => setProductId(event.target.value)}
              options={[{ value: '', label: 'Tous les produits' }, ...products.map(item => ({ value: item.id, label: `${item.name}${item.is_active === false ? ' (archivé)' : ''}` }))]} />}
            <Select id={`${id}-status`} label="Statut des commandes" value={status} onChange={event => setStatus(event.target.value)}
              options={[{ value: 'all', label: 'Tous les statuts' }, ...STATUSES.map(value => ({ value, label: STATUS_LABELS[value] }))]} />
            <Input id={`${id}-from`} label="Du (facultatif)" type="date" value={from} max={to || undefined} onChange={event => setFrom(event.target.value)} />
            <Input id={`${id}-to`} label="Au (facultatif)" type="date" value={to} min={from || undefined} onChange={event => setTo(event.target.value)} />
          </div>
          <p className="text-xs text-gray-500">Les numéros locaux sont interprétés comme ivoiriens (+225). Pour les autres pays, utilisez un numéro international.</p>
          <Button type="submit" disabled={busy}>{busy ? 'Préparation…' : 'Préparer la liste'}</Button>
        </fieldset>
      </form>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {report && <div aria-live="polite" className="space-y-3 rounded-lg bg-gray-50 p-4">
        <p className="font-medium text-gray-900">{report.customers.length} client(s) exportable(s)</p>
        <p className="text-sm text-gray-500">{report.matchedOrders} commande(s) sélectionnée(s) · {report.excludedOrders} sans téléphone exploitable · {report.duplicateOrders} doublon(s) regroupé(s)</p>
        {report.customers.length > 0 ? <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={busy} onClick={() => download('xlsx')}>Télécharger Excel</Button>
          <Button disabled={busy} onClick={() => download('csv')}>Télécharger CSV audience</Button>
        </div> : <p className="text-sm text-gray-500">Aucun client à exporter. Modifiez les filtres ou complétez les téléphones des commandes.</p>}
        <p className="text-xs text-gray-500">Excel contient les noms, téléphones, produits et dates. Le CSV audience contient uniquement la colonne phone, sans doublons.</p>
      </div>}
    </div>}
  </section>
}
