'use client'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
export function OrganizationLogo() {
  const input = useRef<HTMLInputElement>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    fetch('/api/organization/branding').then(async response => {
      if (!response.ok) throw new Error('Impossible de charger le logo.')
      setLogoUrl((await response.json()).logoUrl)
    }).catch(() => setError('Impossible de charger le logo.'))
  }, [])
  async function save(remove = false) {
    const file = input.current?.files?.[0]
    if (!remove && !file) { setError('Choisissez une image PNG ou JPEG.'); return }
    setBusy(true); setError(''); setMessage('')
    try {
      const form = new FormData()
      if (file) form.set('logo', file)
      const response = await fetch('/api/organization/branding', { method: remove ? 'DELETE' : 'POST', ...(remove ? {} : { body: form }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setLogoUrl(data.logoUrl)
      if (input.current) input.current.value = ''
      setMessage(remove ? 'Logo retiré.' : 'Logo enregistré pour les tickets et les documents A4.')
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Enregistrement impossible.') }
    finally { setBusy(false) }
  }
  return <Card><CardHeader><h2 className="font-semibold">Logo de la boutique</h2></CardHeader><CardContent className="space-y-3">
    <p className="text-sm text-gray-500">PNG ou JPEG, maximum 2 Mo. Affiché sur les tickets et les documents A4.</p>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {logoUrl && <img src={logoUrl} alt="Logo actuel de la boutique" className="max-h-24 max-w-full rounded bg-white p-2 object-contain" />}
    <label htmlFor="organization-logo" className="block text-sm font-medium">Choisir un logo</label>
    <input ref={input} id="organization-logo" type="file" accept="image/png,image/jpeg" disabled={busy} className="block w-full text-sm" />
    <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => save()}>{busy ? 'Enregistrement…' : 'Enregistrer le logo'}</Button>{logoUrl && <Button variant="secondary" disabled={busy} onClick={() => save(true)}>Retirer</Button>}</div>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}{message && <p role="status" className="text-sm text-green-700">{message}</p>}
  </CardContent></Card>
}
