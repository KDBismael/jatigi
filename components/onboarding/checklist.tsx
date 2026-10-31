'use client'
import { Icon } from '@/components/ui/icon'
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
  const completedCount = steps.filter(([key]) => progress.completed[key]).length
  const nextStep = steps.find(([key]) => !progress.completed[key])?.[0] ?? 'product'
  const nextActions = {
    product: { href: '/products/new', label: 'Ajouter mon premier produit' },
    driver: { href: '/deliveries', label: 'Ajouter mon premier livreur' },
    order: { href: '/orders/new', label: 'Créer ma première commande' },
  }
  const nextAction = nextActions[nextStep]
  return <Card className="p-4 sm:p-5 space-y-3 border-indigo-200">
    <div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold text-gray-900">Configurez votre boutique</h2><p className="text-sm text-gray-500">{completedCount} / 3 étapes terminées</p></div>
    <div role="progressbar" aria-label="Configuration de la boutique" aria-valuemin={0} aria-valuemax={3} aria-valuenow={completedCount} className="h-1.5 rounded-full bg-gray-100 overflow-hidden"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${completedCount / 3 * 100}%` }} /></div>
    <ol className="space-y-2.5">{steps.map(([key, label], index) => <li key={key} className={`flex items-center gap-2.5 text-sm ${progress.completed[key] ? 'text-gray-500' : 'text-gray-900'}`}>
      <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${progress.completed[key] ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-indigo-600 text-indigo-600'}`} aria-label={progress.completed[key] ? 'Terminé' : 'À faire'}>{progress.completed[key] ? <Icon name="check" className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full border border-current" />}</span>
      <span className={progress.completed[key] ? 'line-through' : 'font-medium'}>{index + 1}. {label}</span>
    </li>)}</ol>
    <Link href={nextAction.href} className="flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">{nextAction.label}</Link>
    <Link href="/onboarding" className="inline-flex min-h-11 items-center font-medium text-indigo-600 text-sm">Reprendre la configuration</Link>
  </Card>
}
