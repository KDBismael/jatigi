'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/services/supabase/client'
import { translateAuthError } from '@/lib/auth-errors'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const origin = window.location.origin
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
      })
      if (error) { setError(translateAuthError(error.message)); return }
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="text-2xl font-bold text-white tracking-tight">Warko</span>
          </Link>
          <p className="mt-2 text-gray-400 text-sm">Réinitialisation du mot de passe</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="text-4xl">📧</div>
              <h2 className="text-white font-semibold text-lg">Email envoyé !</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Un lien de réinitialisation a été envoyé à <strong className="text-white">{email}</strong>.
                Vérifiez votre boîte mail (et vos spams).
              </p>
              <Link href="/auth/login" className="block mt-4 text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
                ← Retour à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h2 className="text-white font-semibold text-lg mb-1">Mot de passe oublié ?</h2>
                <p className="text-gray-400 text-sm">Saisissez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe.</p>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                  Adresse email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-950 border border-red-900 px-3 py-2 rounded-lg">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors mt-2"
              >
                {loading ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
              </button>

              <p className="text-center">
                <Link href="/auth/login" className="text-sm text-gray-400 hover:text-gray-200 transition-colors">
                  ← Retour à la connexion
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
