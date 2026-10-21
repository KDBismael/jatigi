'use client'

import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { downloadParcelExport, type ParcelExportReport } from '@/lib/parcel-export'

export function ParcelExport() {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState<ParcelExportReport | null>(null)

  async function prepare(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setReport(null)
    try {
      const params = new URLSearchParams({ status })
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const response = await fetch(`/api/orders/export?${params}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Export impossible')
      setReport(data)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Export impossible')
    } finally { setBusy(false) }
  }

  async function download(format: 'xlsx' | 'csv') {
    if (!report) return
    setBusy(true)
    setError('')
    try { await downloadParcelExport(report, format) }
    catch { setError('Le téléchargement a échoué. Réessayez.') }
    finally { setBusy(false) }
  }

  return <section className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
    <Button variant="secondary" size="sm" onClick={() => setOpen(!open)} disabled={busy} aria-expanded={open} aria-controls={`${id}-panel`}>
      {open ? 'Fermer l’export colis' : 'Exporter les colis'}
    </Button>
    {open && <div id={`${id}-panel`} className="mt-4 space-y-4">
      <div>
        <h2 className="font-semibold text-gray-900">Colis livrés et non livrés</h2>
        <p className="mt-1 text-sm text-gray-500">Une ligne par commande, sur tout l’historique par défaut. Les non livrés incluent les commandes annulées, identifiées par leur statut.</p>
      </div>
      <form onSubmit={prepare}>
        <fieldset disabled={busy} onChange={() => { setReport(null); setError('') }} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Select id={`${id}-status`} label="Colis à exporter" value={status} onChange={event => setStatus(event.target.value)}
              options={[{ value: 'all', label: 'Livrés et non livrés' }, { value: 'delivered', label: 'Livrés' }, { value: 'not_delivered', label: 'Non livrés (annulés inclus)' }]} />
            <Input id={`${id}-from`} label="Du (date de commande)" type="date" value={from} max={to || undefined} onChange={event => setFrom(event.target.value)} />
            <Input id={`${id}-to`} label="Au (date de commande)" type="date" value={to} min={from || undefined} onChange={event => setTo(event.target.value)} />
          </div>
          <Button type="submit">{busy ? 'Préparation…' : 'Préparer l’export'}</Button>
        </fieldset>
      </form>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {report && <div aria-live="polite" className="space-y-3 rounded-lg bg-gray-50 p-4">
        <p className="font-medium text-gray-900">{report.delivered.length} livré(s) · {report.notDelivered.length} non livré(s)</p>
        {report.delivered.length + report.notDelivered.length > 0 ? <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => download('xlsx')}>Télécharger Excel (.xlsx)</Button>
          <Button variant="secondary" disabled={busy} onClick={() => download('csv')}>Télécharger CSV</Button>
        </div> : <p className="text-sm text-gray-500">Aucun colis pour ces filtres.</p>}
        <p className="text-xs text-gray-500">Compatible Google Sheets : importez le fichier Excel pour obtenir deux onglets, « Livrés » et « Non livrés ». Clients, téléphones, produits, livreurs, statuts et montants sont inclus.</p>
      </div>}
    </div>}
  </section>
}
