'use client'

import { useEffect, useId, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'
import type { DeliveryDayReport, DeliveryDayStatus } from '@/types/delivery-balance'

const statuses: { key: DeliveryDayStatus; label: string }[] = [
  { key: 'delivered', label: 'Livrés' },
  { key: 'in_progress', label: 'En cours' },
  { key: 'cancelled', label: 'Annulés' },
  { key: 'postponed', label: 'Reportés' },
]
const orderStatus: Record<DeliveryDayStatus, string> = {
  delivered: 'Livré', in_progress: 'En cours', cancelled: 'Annulé', postponed: 'Reporté',
}
function day(offset = 0) {
  const value = new Date()
  value.setUTCDate(value.getUTCDate() + offset)
  return value.toISOString().slice(0, 10)
}
function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
}

export function DailyDeliveryBalance() {
  const [date, setDate] = useState(() => day())
  const [result, setResult] = useState<{ date: string; report?: DeliveryDayReport; error?: string } | null>(null)
  const [expanded, setExpanded] = useState<string[]>([])
  const [attempt, setAttempt] = useState(0)
  const inputId = useId()
  const valid = validDate(date)
  const current = result?.date === date ? result : null
  const report = current?.report

  useEffect(() => {
    if (!valid) return
    const controller = new AbortController()
    let active = true
    async function load() {
      try {
        const response = await fetch(`/api/delivery-balance?date=${date}`, { signal: controller.signal, cache: 'no-store' })
        if (!response.ok) throw new Error('Chargement impossible')
        const report: DeliveryDayReport = await response.json()
        if (report.date !== date) throw new Error('Date du bilan incorrecte')
        if (active) setResult({ date, report })
      } catch {
        if (active) setResult({ date, error: 'Impossible de charger le bilan. Réessayez.' })
      }
    }
    void load()
    return () => { active = false; controller.abort() }
  }, [date, valid, attempt])

  function selectDate(value: string) {
    setResult(null)
    setExpanded([])
    setDate(value)
  }
  const totals = report?.drivers.reduce((total, driver) => ({
    delivered: total.delivered + driver.counts.delivered,
    in_progress: total.in_progress + driver.counts.in_progress,
    cancelled: total.cancelled + driver.counts.cancelled,
    postponed: total.postponed + driver.counts.postponed,
    expectedRemittance: total.expectedRemittance + driver.expectedRemittance,
  }), { delivered: 0, in_progress: 0, cancelled: 0, postponed: 0, expectedRemittance: 0 })

  return <section className="space-y-5" aria-label="Bilan quotidien des livraisons">
    <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Bilan du jour</h2>
        <p className="mt-1 text-sm text-gray-500">Colis confiés aux livreurs à la date de tournée sélectionnée (heure d’Abidjan).</p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <Button variant={date === day() ? 'primary' : 'secondary'} onClick={() => selectDate(day())} disabled={date === day()}>Aujourd’hui</Button>
        <Button variant={date === day(-1) ? 'primary' : 'secondary'} onClick={() => selectDate(day(-1))} disabled={date === day(-1)}>Hier</Button>
        <Input id={inputId} label="Date de tournée" type="date" value={date} onChange={event => selectDate(event.target.value)} />
      </div>
      <p className="text-xs text-gray-500">À remettre attendu : produits livrés après remises et acomptes conservés par la boutique, hors frais de livraison. Ce montant ne tient pas compte des versements déjà enregistrés ; le solde global reste dans l’onglet des livreurs.</p>
    </div>
    {!valid && <p className="text-sm text-gray-600">Choisissez une date valide.</p>}
    {valid && !current && <p role="status" className="text-sm text-gray-500">Chargement du bilan…</p>}
    {current?.error && <div className="space-y-2"><p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{current.error}</p>
      <Button variant="secondary" onClick={() => { setResult(null); setAttempt(value=>value+1) }}>Réessayer</Button></div>}
    {report && <>
      {report.undatedOrders > 0 && <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{report.undatedOrders} commandes sans date de tournée : ces anciennes affectations sont exclues du bilan. Renseignez la date dans le détail de chaque commande.</p>}
      {totals && <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
        <h3 className="font-medium text-gray-900">Total de la journée</h3>
        <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {statuses.map(({ key, label }) => <div key={key}><dt className="text-xs text-gray-500">{label}</dt><dd className="mt-1 text-lg font-semibold text-gray-900">{totals[key]}</dd></div>)}
          <div className="col-span-2 sm:col-span-1"><dt className="text-xs text-gray-500">À remettre attendu</dt><dd className="mt-1 text-lg font-semibold text-indigo-700">{formatCurrency(totals.expectedRemittance)}</dd></div>
        </dl>
      </div>}
      {report.drivers.length === 0 ? <p className="py-8 text-center text-sm text-gray-500">Aucun colis confié aux livreurs pour cette date.</p> : <div className="space-y-3">
        <div aria-hidden="true" className="hidden grid-cols-[2fr_repeat(4,1fr)_1.5fr] gap-3 px-4 text-xs font-medium text-gray-500 lg:grid">
          <span>Livreur</span>{statuses.map(status => <span key={status.key}>{status.label}</span>)}<span className="text-right">À remettre attendu</span>
        </div>
        {report.drivers.map((driver, index) => {
          const open = expanded.includes(driver.driverId)
          const detailsId = `${inputId}-driver-${index}`
          return <article key={driver.driverId} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="grid gap-4 p-4 lg:grid-cols-[2fr_repeat(4,1fr)_1.5fr] lg:items-center lg:gap-3">
              <div><button type="button" aria-expanded={open} aria-controls={detailsId} className="text-left font-medium text-indigo-700 hover:underline focus-visible:outline-indigo-600" onClick={() => setExpanded(previous => open ? previous.filter(id => id !== driver.driverId) : [...previous, driver.driverId])}>{driver.driverName} <span aria-hidden="true">{open ? '▴' : '▾'}</span></button>{!driver.isActive && <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Archivé</span>}</div>
              {statuses.map(({ key, label }) => <div key={key} className="flex items-center justify-between text-sm lg:block"><span className="text-gray-500 lg:hidden">{label}</span><span className="font-medium text-gray-900">{driver.counts[key]}</span></div>)}
              <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-sm lg:block lg:border-0 lg:pt-0 lg:text-right"><span className="text-gray-500 lg:hidden">À remettre attendu</span><span className="font-semibold text-indigo-700">{formatCurrency(driver.expectedRemittance)}</span></div>
            </div>
            {open && <div id={detailsId} className="border-t border-gray-100 bg-gray-50 p-4">
              <h4 className="mb-3 text-sm font-medium text-gray-700">Commandes de la tournée</h4>
              <ul className="space-y-3">{driver.orders.map(order => <li key={order.assignmentId} className="rounded-lg border border-gray-200 bg-white p-3 text-sm sm:flex sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0 space-y-1"><Link href={`/orders/${order.orderId}`} className="font-medium text-indigo-700 hover:underline">{order.clientName}</Link><p className="text-gray-500">{order.clientPhone || 'Téléphone non renseigné'}</p><p className="break-words text-gray-700">{order.products}</p></div>
                <div className="mt-3 space-y-1 sm:mt-0 sm:text-right"><p className="text-gray-600">{orderStatus[order.status]}</p><p className="font-medium text-gray-900">{order.status === 'delivered' || order.status === 'cancelled' ? 'À remettre' : 'À remettre si livré'} : {formatCurrency(order.status === 'cancelled' ? 0 : order.remittableAmount)}</p></div>
              </li>)}</ul>
            </div>}
          </article>
        })}
      </div>}
    </>}
  </section>
}
