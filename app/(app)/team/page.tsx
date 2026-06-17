'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { inviteEmployeeSchema, type InviteEmployeeInput } from '@/lib/schemas/team.schema'
import { useTeam } from '@/hooks/use-team'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'
import type { Profile } from '@/types/user'

const roleOptions = [
  { value: 'employee', label: 'Employé' },
  { value: 'admin', label: 'Administrateur' },
]

interface DemoteDialogProps {
  member: Profile
  onConfirm: () => Promise<void>
  onCancel: () => void
}

function DemoteDialog({ member, onConfirm, onCancel }: DemoteDialogProps) {
  const [loading, setLoading] = useState(false)
  const [typed, setTyped] = useState('')

  const CONFIRM_WORD = 'CONFIRMER'

  async function handleConfirm() {
    if (typed !== CONFIRM_WORD) return
    setLoading(true)
    await onConfirm()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-red-100">
        {/* Warning icon */}
        <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
          <span className="text-2xl">⚠️</span>
        </div>

        <h2 className="text-lg font-bold text-gray-900 text-center mb-1">
          Rétrograder en employé
        </h2>
        <p className="text-sm text-gray-500 text-center mb-5">
          Vous êtes sur le point de retirer les droits administrateur à <strong className="text-gray-800">{member.full_name}</strong>.
        </p>

        {/* Consequences */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 space-y-2">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">Conséquences immédiates</p>
          {[
            'Accès au tableau de bord retiré',
            'Accès aux produits et marges retiré',
            'Accès aux analyses retiré',
            'Accès à la gestion d\'équipe retiré',
            'Seul l\'accès aux commandes sera conservé',
          ].map((c) => (
            <div key={c} className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5 shrink-0">✕</span>
              <span className="text-sm text-red-700">{c}</span>
            </div>
          ))}
        </div>

        {/* Confirmation input */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Tapez <span className="font-mono font-bold text-red-600">{CONFIRM_WORD}</span> pour confirmer
          </label>
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
            placeholder={CONFIRM_WORD}
          />
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={loading}>
            Annuler
          </Button>
          <button
            onClick={handleConfirm}
            disabled={typed !== CONFIRM_WORD || loading}
            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Traitement...' : 'Rétrograder'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface RemoveDialogProps {
  member: Profile
  onConfirm: () => Promise<void>
  onCancel: () => void
}

function RemoveDialog({ member, onConfirm, onCancel }: RemoveDialogProps) {
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    await onConfirm()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-red-100">
        <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
          <span className="text-2xl">🗑️</span>
        </div>
        <h2 className="text-lg font-bold text-gray-900 text-center mb-1">Supprimer le membre</h2>
        <p className="text-sm text-gray-500 text-center mb-5">
          Le compte de <strong className="text-gray-800">{member.full_name}</strong> sera définitivement supprimé. Cette action est irréversible.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={loading}>
            Annuler
          </Button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-40 transition-colors"
          >
            {loading ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TeamPage() {
  const { members, isLoading, invite, remove, changeRole } = useTeam()
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Dialogs state
  const [demoteTarget, setDemoteTarget] = useState<Profile | null>(null)
  const [removeTarget, setRemoveTarget] = useState<Profile | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteEmployeeInput>({
    resolver: zodResolver(inviteEmployeeSchema),
    defaultValues: { role: 'employee' },
  })

  async function onSubmit(data: InviteEmployeeInput) {
    setError(null)
    setSubmitting(true)
    try {
      await invite(data)
      reset()
      setShowForm(false)
    } catch (err) {
      setError(String(err))
    } finally {
      setSubmitting(false)
    }
  }

  function handleRoleToggle(member: Profile) {
    if (member.role === 'admin') {
      // Admin → employee: requires confirmation dialog
      setDemoteTarget(member)
    } else {
      // Employee → admin: no warning needed, straightforward promotion
      changeRole(member.id, 'admin')
    }
  }

  return (
    <>
      {/* Demote confirmation dialog */}
      {demoteTarget && (
        <DemoteDialog
          member={demoteTarget}
          onConfirm={async () => {
            await changeRole(demoteTarget.id, 'employee')
            setDemoteTarget(null)
          }}
          onCancel={() => setDemoteTarget(null)}
        />
      )}

      {/* Remove confirmation dialog */}
      {removeTarget && (
        <RemoveDialog
          member={removeTarget}
          onConfirm={async () => {
            await remove(removeTarget.id)
            setRemoveTarget(null)
          }}
          onCancel={() => setRemoveTarget(null)}
        />
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Équipe</h1>
            <p className="text-gray-500 text-sm mt-1">{members.length} membre(s)</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Annuler' : '+ Ajouter un membre'}
          </Button>
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-gray-900">Nouveau membre</h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Nom complet" error={errors.full_name?.message} {...register('full_name')} />
                  <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
                  <Input label="Mot de passe" type="password" error={errors.password?.message} {...register('password')} />
                  <Select label="Rôle" options={roleOptions} error={errors.role?.message} {...register('role')} />
                </div>
                {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Création...' : 'Créer le compte'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Membres de l&apos;équipe</h2>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : members.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Aucun membre</p>
            ) : (
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
                  {members.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="py-3 pr-4 font-medium text-gray-900">{m.full_name}</td>
                      <td className="py-3 pr-4">
                        <Badge className={m.role === 'admin' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'}>
                          {m.role === 'admin' ? 'Administrateur' : 'Employé'}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-gray-500">{formatDate(m.created_at)}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleRoleToggle(m)}
                            className={`text-xs hover:underline ${
                              m.role === 'admin' ? 'text-orange-500' : 'text-indigo-600'
                            }`}
                          >
                            {m.role === 'admin' ? '→ Employé' : '→ Admin'}
                          </button>
                          <button
                            onClick={() => setRemoveTarget(m)}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
