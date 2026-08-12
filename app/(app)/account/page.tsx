'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { translateAuthError } from '@/lib/auth-errors'
import { ThemeSelect } from '@/components/layout/theme-select'

export default function AccountPage() {
  const { profile } = useAuthStore()
  const [currentEmail, setCurrentEmail] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [emailSubmitting, setEmailSubmitting] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data: { user } }) => {
      const email = user?.email ?? ''
      setCurrentEmail(email)
      setNewEmail(email)
    })
  }, [])

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEmailError(null)
    setEmailSuccess(null)

    const email = newEmail.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Adresse email invalide.')
      return
    }
    if (email === currentEmail.toLowerCase()) {
      setEmailError('Saisissez une nouvelle adresse email.')
      return
    }

    setEmailSubmitting(true)
    try {
      const supabase = createClient()
      const { data, error: updateError } = await supabase.auth.updateUser({ email })
      if (updateError) throw updateError

      if (data.user?.email?.toLowerCase() === email) {
        setCurrentEmail(data.user.email)
        setEmailSuccess('Email mis à jour avec succès.')
      } else {
        setEmailSuccess('Un email de confirmation a été envoyé. Le changement sera appliqué après validation.')
      }
    } catch (err: unknown) {
      setEmailError(err instanceof Error ? translateAuthError(err.message) : 'Une erreur est survenue.')
    } finally {
      setEmailSubmitting(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (newPassword.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return }
    if (newPassword !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }

    setSubmitting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) throw new Error('Session expirée.')

      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword })
      if (signInError) { setError('Mot de passe actuel incorrect.'); return }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) throw updateError

      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirm('')
    } catch (err: unknown) {
      setError(err instanceof Error ? translateAuthError(err.message) : 'Une erreur est survenue.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mon compte</h1>
        <p className="text-gray-500 text-sm mt-1">{profile?.full_name}{currentEmail ? ` · ${currentEmail}` : ''}</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Modifier l&apos;email</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <Input
              label="Adresse email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              placeholder="vous@exemple.com"
            />

            {emailError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{emailError}</p>}
            {emailSuccess && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">{emailSuccess}</p>}

            <Button type="submit" disabled={emailSubmitting}>
              {emailSubmitting ? 'Mise à jour...' : 'Modifier l’email'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Changer le mot de passe</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <PasswordInput
              label="Mot de passe actuel"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
            <PasswordInput
              label="Nouveau mot de passe"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="Min. 8 caractères"
            />
            <PasswordInput
              label="Confirmer le nouveau mot de passe"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              placeholder="••••••••"
            />

            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            {success && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">Mot de passe mis à jour avec succès.</p>}

            <Button type="submit" disabled={submitting}>
              {submitting ? 'Mise à jour...' : 'Mettre à jour'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card><CardHeader><h2 className="font-semibold text-gray-900">Apparence</h2></CardHeader><CardContent><ThemeSelect /><p className="mt-2 text-xs text-gray-500">Le mode système suit automatiquement les réglages de cet appareil.</p></CardContent></Card>
    </div>
  )
}
