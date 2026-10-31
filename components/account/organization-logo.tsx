'use client'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
export function OrganizationLogo() {
  const input = useRef<HTMLInputElement>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [picked, setPicked] = useState<{ file: File; url: string } | null>(null)
  // Release the previous preview URL when the selection changes or the card unmounts.
  useEffect(() => () => { if (picked) URL.revokeObjectURL(picked.url) }, [picked])
  const file = picked?.file ?? null
  const shown = picked?.url ?? logoUrl
  function pick(next: File | null) { setPicked(next ? { file: next, url: URL.createObjectURL(next) } : null) }
  useEffect(() => {
    fetch('/api/organization/branding').then(async response => {
      if (!response.ok) throw new Error('Impossible de charger le logo.')
      setLogoUrl((await response.json()).logoUrl)
    }).catch(() => setError('Impossible de charger le logo.'))
  }, [])
  async function save(remove = false) {
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
      setPicked(null)
      setMessage(remove ? 'Logo retiré.' : 'Logo enregistré pour les tickets et les documents A4.')
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Enregistrement impossible.') }
    finally { setBusy(false) }
  }
  return <Card><CardHeader><h2 className="font-semibold">Logo de la boutique</h2></CardHeader><CardContent className="space-y-3">
    <p className="text-sm text-gray-500">PNG ou JPEG, maximum 2 Mo. Affiché sur les tickets et les documents A4.</p>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {shown && <img src={shown} alt={picked ? 'Aperçu du nouveau logo' : 'Logo actuel de la boutique'} className="max-h-24 max-w-full rounded border border-gray-100 bg-white p-2 object-contain" />}
    {/* The native input stays keyboard-focusable; the label is the visible button. */}
    <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-indigo-300 bg-indigo-50/50 px-4 py-3 text-sm font-semibold text-indigo-700 transition-colors hover:border-indigo-500 hover:bg-indigo-50 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
      <Icon name="image" />
      <span>{file ? 'Changer d’image' : 'Choisir une image'}</span>
      <input ref={input} type="file" accept="image/png,image/jpeg" disabled={busy} aria-label="Choisir une image" className="sr-only" onChange={e => { pick(e.target.files?.[0] ?? null); setError(''); setMessage('') }} />
    </label>
    {file && <p className="truncate text-sm text-gray-600"><span className="font-medium text-gray-900">{file.name}</span> sera enregistré après validation.</p>}
    <div className="flex flex-wrap gap-2"><Button disabled={busy || !file} onClick={() => save()}>{busy ? 'Enregistrement…' : 'Enregistrer le logo'}</Button>{logoUrl && <Button variant="secondary" disabled={busy} onClick={() => save(true)}>Retirer</Button>}</div>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}{message && <p role="status" className="text-sm text-green-700">{message}</p>}
  </CardContent></Card>
}
