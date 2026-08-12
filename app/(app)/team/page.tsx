'use client'

import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { inviteEmployeeSchema, type InviteEmployeeInput } from '@/lib/schemas/team.schema'
import { salesPersonSchema, type SalesPersonInput } from '@/lib/schemas/sales-person.schema'
import { useTeam } from '@/hooks/use-team'
import { useSalesPeople } from '@/hooks/use-sales-people'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { PasswordInput } from '@/components/ui/password-input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Profile } from '@/types/user'
import type { SalesPerson, SalesPersonEvaluation } from '@/types/sales-person'

const roleOptions = [
  { value: 'employee', label: 'Employé' },
  { value: 'admin', label: 'Administrateur' },
]

const personTypeOptions = [
  { value: 'internal', label: 'Interne sans compte' },
  { value: 'external', label: 'Externe' },
]

const salaryModeOptions = [
  { value: 'manual', label: 'Manuel' },
  { value: 'automatic', label: 'Automatique' },
]

function roleLabel(role: Profile['role']) {
  return role === 'admin' ? 'Administrateur' : 'Employé'
}

function typeLabel(type: SalesPerson['person_type']) {
  if (type === 'account') return 'Compte utilisateur'
  if (type === 'external') return 'Externe'
  return 'Interne'
}

export default function TeamPage() {
  const { members, isLoading, invite, remove, changeRole } = useTeam()
  const { people, isLoading: peopleLoading, create, update, remove: removePerson, addEvaluation } = useSalesPeople()
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [showPersonForm, setShowPersonForm] = useState(false)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [personError, setPersonError] = useState<string | null>(null)
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null)
  const [histories, setHistories] = useState<Record<string, SalesPersonEvaluation[]>>({})
  const [busy, setBusy] = useState(false)

  const accountForm = useForm<InviteEmployeeInput>({
    resolver: zodResolver(inviteEmployeeSchema),
    defaultValues: { role: 'employee' },
  })

  const personForm = useForm<SalesPersonInput>({
    resolver: zodResolver(salesPersonSchema) as unknown as Resolver<SalesPersonInput>,
    defaultValues: {
      full_name: '',
      phone: '',
      person_type: 'internal',
      base_salary: 0,
      salary_mode: 'manual',
      hired_on: new Date().toISOString().slice(0, 10),
      is_active: true,
    },
  })

  async function createAccount(data: InviteEmployeeInput) {
    setAccountError(null)
    setBusy(true)
    try {
      await invite(data)
      accountForm.reset({ role: 'employee', full_name: '', email: '', password: '' })
      setShowAccountForm(false)
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function createPerson(data: SalesPersonInput) {
    setPersonError(null)
    setBusy(true)
    try {
      await create(data)
      personForm.reset({
        full_name: '',
        phone: '',
        person_type: 'internal',
        base_salary: 0,
        salary_mode: 'manual',
        hired_on: new Date().toISOString().slice(0, 10),
        is_active: true,
      })
      setShowPersonForm(false)
    } catch (err) {
      setPersonError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function editPerson(person: SalesPerson) {
    const fullName = prompt('Nom complet', person.full_name)
    if (!fullName) return
    const phone = prompt('Téléphone', person.phone ?? '') ?? ''
    const salary = prompt('Salaire mensuel FCFA', String(person.base_salary))
    if (salary === null) return
    const mode = confirm('OK = salaire automatique chaque mois. Annuler = salaire manuel.')
      ? 'automatic'
      : 'manual'
    await update({
      id: person.id,
      full_name: fullName,
      phone,
      base_salary: Number(salary) || 0,
      salary_mode: mode,
    })
  }

  async function evaluatePerson(person: SalesPerson) {
    const rating = prompt(`Note de ${person.full_name} sur 5`, String(person.latest_evaluation?.rating ?? 4))
    if (!rating) return
    const note = prompt('Commentaire', person.latest_evaluation?.note ?? '') ?? ''
    await addEvaluation(person.id, {
      rating: Number(rating),
      note,
      evaluated_on: new Date().toISOString().slice(0, 10),
    })
    setHistories((prev) => {
      const next = { ...prev }
      delete next[person.id]
      return next
    })
  }

  async function deletePerson(person: SalesPerson) {
    if (!confirm(`Supprimer ${person.full_name} ? Si un historique existe, la personne sera seulement désactivée.`)) return
    const result = await removePerson(person.id)
    alert(result.message)
  }

  async function toggleHistory(person: SalesPerson) {
    if (openHistoryId === person.id) {
      setOpenHistoryId(null)
      return
    }
    setOpenHistoryId(person.id)
    if (histories[person.id]) return
    const res = await fetch(`/api/sales-people/${person.id}/evaluations`)
    const data = await res.json()
    setHistories((prev) => ({ ...prev, [person.id]: Array.isArray(data) ? data : [] }))
  }

  async function deleteMember(member: Profile) {
    if (!confirm(`Supprimer définitivement le compte de ${member.full_name} ?`)) return
    await remove(member.id)
  }

  async function toggleRole(member: Profile) {
    if (member.role === 'admin' && !confirm(`Retirer les droits admin à ${member.full_name} ?`)) return
    await changeRole(member.id, member.role === 'admin' ? 'employee' : 'admin')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Équipe</h1>
          <p className="text-gray-500 text-sm mt-1">
            Comptes de connexion, vendeurs internes et suivi humain.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowPersonForm((v) => !v)}>
            {showPersonForm ? 'Annuler' : '+ Personne commerciale'}
          </Button>
          <Button onClick={() => setShowAccountForm((v) => !v)}>
            {showAccountForm ? 'Annuler' : '+ Compte utilisateur'}
          </Button>
        </div>
      </div>

      {showAccountForm && (
        <Card>
          <CardHeader><h2 className="font-semibold text-gray-900">Nouveau compte utilisateur</h2></CardHeader>
          <CardContent>
            <form onSubmit={accountForm.handleSubmit(createAccount)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Nom complet" error={accountForm.formState.errors.full_name?.message} {...accountForm.register('full_name')} />
                <Input label="Email" type="email" error={accountForm.formState.errors.email?.message} {...accountForm.register('email')} />
                <PasswordInput label="Mot de passe" error={accountForm.formState.errors.password?.message} {...accountForm.register('password')} />
                <Select label="Rôle" options={roleOptions} error={accountForm.formState.errors.role?.message} {...accountForm.register('role')} />
              </div>
              {accountError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{accountError}</p>}
              <Button type="submit" disabled={busy}>{busy ? 'Création…' : 'Créer le compte'}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {showPersonForm && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Nouvelle personne commerciale</h2>
            <p className="text-sm text-gray-500">Pour un vendeur ou employé suivi sans créer de compte de connexion.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={personForm.handleSubmit(createPerson)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Nom complet" error={personForm.formState.errors.full_name?.message} {...personForm.register('full_name')} />
                <Input label="Téléphone" type="tel" error={personForm.formState.errors.phone?.message} {...personForm.register('phone')} />
                <Select label="Type" options={personTypeOptions} error={personForm.formState.errors.person_type?.message} {...personForm.register('person_type')} />
                <Input label="Date d’entrée" type="date" error={personForm.formState.errors.hired_on?.message} {...personForm.register('hired_on')} />
                <Input label="Salaire mensuel (FCFA)" type="number" min="0" error={personForm.formState.errors.base_salary?.message} {...personForm.register('base_salary')} />
                <Select label="Mode salaire" options={salaryModeOptions} error={personForm.formState.errors.salary_mode?.message} {...personForm.register('salary_mode')} />
              </div>
              {personError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{personError}</p>}
              <Button type="submit" disabled={busy}>{busy ? 'Enregistrement…' : 'Créer la personne'}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Personnes commerciales</h2>
          <p className="text-sm text-gray-500">Sélectionnables comme vendeurs dans Commandes et Objectifs.</p>
        </CardHeader>
        <CardContent>
          {peopleLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : people.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Aucune personne commerciale.</p>
          ) : (
            <div className="grid lg:grid-cols-2 gap-3">
              {people.map((person) => (
                <div key={person.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{person.full_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {typeLabel(person.person_type)} · Entrée {formatDate(person.hired_on)}
                      </p>
                    </div>
                    <Badge className={person.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}>
                      {person.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                    <div>
                      <p className="text-gray-500">CA du mois</p>
                      <p className="font-semibold">{formatCurrency(Number(person.month_revenue ?? 0))}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Commandes livrées</p>
                      <p className="font-semibold">{person.month_order_count ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Salaire</p>
                      <p className="font-semibold">{formatCurrency(Number(person.base_salary))}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Mode</p>
                      <p className="font-semibold">{person.salary_mode === 'automatic' ? 'Auto' : 'Manuel'}</p>
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm">
                    Dernière évaluation : {person.latest_evaluation ? `${person.latest_evaluation.rating}/5 · ${person.latest_evaluation.note || 'Sans commentaire'}` : 'aucune'}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Button size="sm" variant="secondary" onClick={() => editPerson(person)}>Modifier</Button>
                    <Button size="sm" variant="secondary" onClick={() => evaluatePerson(person)}>Évaluer</Button>
                    <Button size="sm" variant="secondary" onClick={() => toggleHistory(person)}>Historique</Button>
                    <Button size="sm" variant="ghost" onClick={() => update({ id: person.id, is_active: !person.is_active })}>
                      {person.is_active ? 'Désactiver' : 'Réactiver'}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deletePerson(person)}>
                      Supprimer
                    </Button>
                  </div>
                  {openHistoryId === person.id && (
                    <div className="mt-4 border-t border-gray-100 pt-3 space-y-2">
                      {(histories[person.id] ?? []).length === 0 ? (
                        <p className="text-sm text-gray-500">Aucune évaluation enregistrée.</p>
                      ) : histories[person.id].map((evaluation) => (
                        <div key={evaluation.id} className="rounded-lg bg-white border border-gray-100 px-3 py-2 text-sm">
                          <div className="flex justify-between gap-3">
                            <strong>{evaluation.rating}/5</strong>
                            <span className="text-xs text-gray-500">{formatDate(evaluation.evaluated_on)}</span>
                          </div>
                          {evaluation.note && <p className="text-gray-600 mt-1">{evaluation.note}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Comptes utilisateurs</h2>
          <p className="text-sm text-gray-500">Personnes qui peuvent se connecter à Warko.</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : members.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Aucun compte utilisateur.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="pb-3 pr-4 font-medium text-gray-600">Nom</th>
                    <th className="pb-3 pr-4 font-medium text-gray-600">Rôle</th>
                    <th className="pb-3 pr-4 font-medium text-gray-600">Depuis</th>
                    <th className="pb-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="py-3 pr-4 font-medium text-gray-900">{member.full_name}</td>
                      <td className="py-3 pr-4">
                        <Badge className={member.role === 'admin' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'}>
                          {roleLabel(member.role)}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-gray-500">{formatDate(member.created_at)}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button size="sm" variant="secondary" onClick={() => toggleRole(member)}>
                            {member.role === 'admin' ? '→ Employé' : '→ Admin'}
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteMember(member)}>
                            Supprimer
                          </Button>
                        </div>
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
