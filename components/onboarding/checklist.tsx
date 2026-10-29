'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth-store'
import { Card } from '@/components/ui/card'
import type { OnboardingProgress } from '@/lib/onboarding'

export function OnboardingChecklist() {
  const { profile } = useAuthStore()
  const [progress, setProgress] = useState<OnboardingProgress | null>(null)
  useEffect(() => {
    if (profile?.role !== 'admin') return
    let active = true
    void fetch('/api/onboarding').then(r => r.ok ? r.json() : null).then(data => { if (active) setProgress(data) }).catch(() => {})
    return () => { active = false }
  }, [profile?.role])
  if (!progress || progress.complete || profile?.role !== 'admin') return null
  const steps = [['product', 'Ajouter un produit'], ['driver', 'Ajouter un livreur'], ['order', 'Créer une commande']] as const
  return <Card className="p-5 space-y-3 border-indigo-200"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">Configurez votre boutique</h2><p className="text-sm text-gray-500">{Object.values(progress.completed).filter(Boolean).length} / 3 étapes terminées</p></div><ol className="space-y-2">{steps.map(([key,label], index) => <li key={key} className="flex gap-2 text-sm"><span aria-label={progress.completed[key] ? 'Terminé' : 'À faire'}>{progress.completed[key] ? '✓' : '○'}</span>{index + 1}. {label}</li>)}</ol><Link href="/onboarding" className="inline-block font-medium text-indigo-600 text-sm">Reprendre la configuration</Link></Card>
}
