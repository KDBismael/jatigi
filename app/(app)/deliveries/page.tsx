'use client'

import { FormEvent, useState } from 'react'
import { useDeliveryDrivers } from '@/hooks/use-delivery-drivers'
import { useRole } from '@/hooks/use-role'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'

export default function DeliveriesPage() {
  const { drivers, isLoading, error, create, settle } = useDeliveryDrivers()
  const { isAdmin } = useRole()
  const [showDriverForm, setShowDriverForm] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [settlingId, setSettlingId] = useState<string | null>(null)
  const [settlementAmount, setSettlementAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setFormError(null)
    setSuccessMessage(null)
    try {
      await create({ name, phone })
      setName('')
      setPhone('')
      setShowDriverForm(false)
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Erreur')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSettlement(driverId: string) {
    setSubmitting(true)
    setFormError(null)
    setSuccessMessage(null)
    try {
      const amount = Number(settlementAmount)
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Saisissez un montant de versement valide.')
      }
      await settle(driverId, {
        amount,
        settled_at: new Date().toISOString().slice(0, 10),
        note: '',
      })
      setSettlementAmount('')
      setSettlingId(null)
      setSuccessMessage(`Versement de ${formatCurrency(amount)} enregistré.`)
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Erreur')
    } finally {
      setSubmitting(false)
    }
  }

  const totals = drivers.reduce((sum, driver) => ({
    active: sum.active + driver.packages_in_progress,
    delivered: sum.delivered + driver.packages_delivered,
    due: sum.due + driver.amount_due,
  }), { active: 0, delivered: 0, due: 0 })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Livraisons</h1>
          <p className="text-sm text-gray-500 mt-1">Suivez les colis et les reversements de chaque livreur.</p>
        </div>
        {isAdmin && <Button onClick={() => setShowDriverForm((visible) => !visible)}>+ Ajouter un livreur</Button>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-5"><p className="text-xs text-gray-500">Colis en circulation</p><p className="text-2xl font-bold text-orange-600 mt-1">{totals.active}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs text-gray-500">Colis livrés</p><p className="text-2xl font-bold text-green-600 mt-1">{totals.delivered}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs text-gray-500">Total à reverser</p><p className="text-2xl font-bold text-indigo-600 mt-1">{formatCurrency(totals.due)}</p></CardContent></Card>
      </div>

      {showDriverForm && isAdmin && (
        <Card>
          <CardHeader><h2 className="font-semibold text-gray-900">Nouveau livreur</h2></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
              <Input label="Nom" value={name} onChange={(event) => setName(event.target.value)} required />
              <Input label="Téléphone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
              <Button type="submit" disabled={submitting}>{submitting ? 'Ajout...' : 'Ajouter'}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {(error || formError) && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{formError ?? error}</p>}
      {successMessage && <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3">{successMessage}</p>}

      <Card>
        <CardHeader><h2 className="font-semibold text-gray-900">Situation par livreur</h2></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-14 w-full" />)}</div>
          ) : drivers.length === 0 ? (
            <p className="text-center text-gray-500 py-10">Ajoutez votre premier livreur pour commencer le suivi.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-200 text-left">
                  <th className="pb-3 pr-4 font-medium text-gray-600">Livreur</th>
                  <th className="pb-3 pr-4 font-medium text-gray-600">En cours</th>
                  <th className="pb-3 pr-4 font-medium text-gray-600">Livrés</th>
                  <th className="pb-3 pr-4 font-medium text-gray-600">Annulés</th>
                  <th className="pb-3 pr-4 font-medium text-gray-600">Réussite</th>
                  <th className="pb-3 pr-4 font-medium text-gray-600">Encaissé</th>
                  <th className="pb-3 pr-4 font-medium text-gray-600">Déjà reversé</th>
                  <th className="pb-3 font-medium text-gray-600">À reverser</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {drivers.map((driver) => (
                    <tr key={driver.id}>
                      <td className="py-4 pr-4"><p className="font-medium text-gray-900">{driver.name}</p>{driver.phone && <p className="text-xs text-gray-400">{driver.phone}</p>}</td>
                      <td className="py-4 pr-4 text-orange-600 font-medium">{driver.packages_in_progress}</td>
                      <td className="py-4 pr-4 text-green-600 font-medium">{driver.packages_delivered}</td>
                      <td className="py-4 pr-4 text-gray-500">{driver.packages_cancelled}</td>
                      <td className="py-4 pr-4 text-gray-700">{driver.success_rate}%</td>
                      <td className="py-4 pr-4 text-gray-700">{formatCurrency(driver.amount_collected)}</td>
                      <td className="py-4 pr-4 text-gray-700">{formatCurrency(driver.amount_remitted)}</td>
                      <td className="py-4">
                        <p className="font-semibold text-indigo-700">{formatCurrency(driver.amount_due)}</p>
                        {isAdmin && driver.amount_due > 0 && (settlingId === driver.id ? (
                          <div className="flex gap-2 mt-2 min-w-56">
                            <Input type="number" min={1} max={driver.amount_due} placeholder="Montant reversé" value={settlementAmount} onChange={(event) => setSettlementAmount(event.target.value)} />
                            <Button type="button" size="sm" disabled={submitting} onClick={() => handleSettlement(driver.id)}>Valider</Button>
                          </div>
                        ) : <button type="button" className="text-xs text-indigo-600 hover:underline mt-1" onClick={() => setSettlingId(driver.id)}>Enregistrer un versement</button>)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
