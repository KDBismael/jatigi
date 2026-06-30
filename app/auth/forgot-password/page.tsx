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

  async function sendResetEmail() {
    const supabase = createClient()
    const origin = window.location.origin
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
    })
    if (error) { setError(translateAuthError(error.message)); return false }
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (await sendResetEmail()) setSent(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setError(null)
    setLoading(true)
    try {
      await sendResetEmail()
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
            <div className="text-center space-y-5">
              <div className="w-16 h-16 mx-auto rounded-full bg-indigo-500/15 flex items-center justify-center">
                <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <div className="space-y-2">
                <h2 className="text-white font-bold text-xl">Email envoyé !</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Un lien de réinitialisation a été envoyé à <strong className="text-white">{email}</strong>.
                  Vérifiez votre boîte mail (et vos spams).
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-950 border border-red-900 px-3 py-2 rounded-lg">{error}</p>
              )}

              <Link
                href="/auth/login"
                className="block w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-500 transition-colors"
              >
                Retour à la connexion
              </Link>
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Envoi en cours...' : "Renvoyer l'email"}
              </button>
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

        <div className="mt-6 text-center space-y-3">
          <p className="text-sm text-gray-500">
            Besoin d&apos;aide ?{' '}
            <a href="mailto:support@warko.app" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Contacter le support
            </a>
          </p>
          <p className="inline-flex items-center gap-1.5 text-xs text-gray-600 uppercase tracking-wide">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            Warko Security
          </p>
        </div>
      </div>
    </div>
  )
}
