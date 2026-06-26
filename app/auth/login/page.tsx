'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/services/supabase/client'
import { PasswordInput } from '@/components/ui/password-input'

type Mode = 'login' | 'signup'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    window.location.href = '/orders'
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: fullName, organization_name: orgName }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(typeof data.error === 'string' ? data.error : 'Une erreur est survenue')
      setLoading(false)
      return
    }
    const supabase = createClient()
    const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password })
    if (loginErr) { setError('Compte créé, mais connexion échouée. Veuillez vous connecter manuellement.'); setLoading(false); return }
    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="text-2xl font-bold text-white tracking-tight">Jatigi</span>
          </Link>
          <p className="mt-2 text-gray-400 text-sm">
            {mode === 'login' ? 'Connectez-vous à votre espace' : 'Créez votre boutique'}
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          {/* Tabs */}
          <div className="flex bg-gray-800 rounded-lg p-1 mb-6">
            <button type="button" onClick={() => switchMode('login')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}>
              Connexion
            </button>
            <button type="button" onClick={() => switchMode('signup')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'signup' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}>
              Créer ma boutique
            </button>
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <Field label="Email" id="email" type="email" value={email} onChange={setEmail} placeholder="vous@exemple.com" />
              <div className="space-y-1">
                <PasswordInput
                  id="password"
                  label="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  darkTheme
                />
                <div className="flex justify-end">
                  <Link href="/auth/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                    Mot de passe oublié ?
                  </Link>
                </div>
              </div>
              <ErrorBox error={error} />
              <SubmitButton loading={loading} label="Se connecter" loadingLabel="Connexion..." />
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <Field label="Nom de votre boutique" id="orgName" type="text" value={orgName} onChange={setOrgName} placeholder="Ex : Boutique Aminata" />
              <Field label="Votre nom complet" id="fullName" type="text" value={fullName} onChange={setFullName} placeholder="Aminata Diallo" />
              <Field label="Email" id="email2" type="email" value={email} onChange={setEmail} placeholder="vous@exemple.com" />
              <PasswordInput
                id="password2"
                label="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 caractères"
                required
                darkTheme
              />
              <ErrorBox error={error} />
              <SubmitButton loading={loading} label="Créer ma boutique" loadingLabel="Création..." />
              <p className="text-xs text-gray-500 text-center leading-relaxed">
                En créant votre boutique, vous devenez administrateur. Vous pourrez ensuite ajouter vos employés depuis la page Équipe.
              </p>
            </form>
          )}
        </div>

        <p className="text-center mt-6 text-xs text-gray-600">
          <Link href="/" className="hover:text-gray-400 transition-colors">← Retour à l&apos;accueil</Link>
        </p>
      </div>
    </div>
  )
}

function Field({ label, id, type, value, onChange, placeholder }: {
  label: string; id: string; type: string; value: string
  onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
      <input id={id} type={type} required value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
    </div>
  )
}

function ErrorBox({ error }: { error: string | null }) {
  if (!error) return null
  return <p className="text-sm text-red-400 bg-red-950 border border-red-900 px-3 py-2 rounded-lg">{error}</p>
}

function SubmitButton({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <button type="submit" disabled={loading}
      className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors mt-2">
      {loading ? loadingLabel : label}
    </button>
  )
}
