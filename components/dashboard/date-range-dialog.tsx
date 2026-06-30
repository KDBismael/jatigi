'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

interface DateRangeDialogProps {
  initialFrom?: string
  initialTo?: string
  onApply: (from: string, to: string) => void
  onCancel: () => void
}

export function DateRangeDialog({ initialFrom, initialTo, onApply, onCancel }: DateRangeDialogProps) {
  const [from, setFrom] = useState(initialFrom ?? '')
  const [to, setTo] = useState(initialTo ?? '')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  function handleApply() {
    if (!from || !to) {
      setError('Veuillez sélectionner une date de début et de fin.')
      return
    }
    if (from > to) {
      setError('La date de début doit précéder la date de fin.')
      return
    }
    onApply(from, to)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Période personnalisée</h2>
          <p className="text-sm text-gray-500 mt-0.5">Choisissez une date de début et de fin</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Date de début</label>
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => { setFrom(e.target.value); setError(null) }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Date de fin</label>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => { setTo(e.target.value); setError(null) }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-1">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Annuler</Button>
          <Button variant="primary" className="flex-1" onClick={handleApply}>Appliquer</Button>
        </div>
      </div>
    </div>
  )
}
