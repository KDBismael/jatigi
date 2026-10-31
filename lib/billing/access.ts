import { PLANS } from './plans'
import { NextResponse } from 'next/server'
import { MonerizError } from './moneriz'

export class BillingAccessError extends Error {
  constructor(public code: string, message: string, public status = 402) { super(message) }
}
const limits: Record<string, string> = {
  PLAN_ORDER_LIMIT: `Vous avez atteint ${PLANS.discovery.ordersPerMonth} commandes ce mois. Passez au plan Pro pour continuer. Vos commandes existantes restent accessibles.`,
  PLAN_DRIVER_LIMIT: 'La limite de livreurs actifs de votre offre est atteinte. Changez de plan pour en ajouter un.',
  PLAN_USER_LIMIT: 'La limite de comptes de votre offre est atteinte. Changez de plan pour ajouter un collaborateur.',
}
export function billingErrorResponse(error: unknown) {
  if (error instanceof BillingAccessError) return NextResponse.json({ error: error.message, code: error.code, upgradeUrl: '/subscription' }, { status: error.status, headers: { 'Cache-Control': 'no-store' } })
  if (error instanceof MonerizError) return NextResponse.json({ error: error.code === 'KYB_REQUIRED' ? 'Les paiements sont momentanément indisponibles : la vérification du compte marchand doit être finalisée.' : 'Le paiement n’est pas encore confirmé. Réessayez cette même demande ou contactez le support.', code: error.code }, { status: error.status, headers: { 'Cache-Control': 'no-store', ...(error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {}) } })
  const message = error instanceof Error ? error.message : String(error)
  const code = Object.keys(limits).find(key => message.includes(key))
  if (code) return NextResponse.json({ error: limits[code], code, upgradeUrl: '/subscription' }, { status: 402 })
  const cases: Record<string, [string,number]> = {
    PLAN_LIVE_REQUIRED: ['Les sessions live sont incluses dans toutes les offres. Une mise à jour de la plateforme est nécessaire pour les activer.',503],
    BILLING_OWNER_REQUIRED: ['Seul le propriétaire peut gérer l’abonnement.',403],
    BILLING_PAYMENT_PENDING: ['Un paiement attend déjà une confirmation. Reprenez-le avant de changer d’offre.',409],
    BILLING_RETRY_LATER: ['Attendez quelques secondes avant de reprendre cette demande.',429],
    BILLING_INVOICE_NOT_FOUND: ['Paiement introuvable.',404],
    BILLING_MODE_MISMATCH: ['Le mode de paiement doit être configuré par l’administrateur de la plateforme.',503],
  }
  const key = Object.keys(cases).find(key=>message.includes(key))
  const [text,status] = key ? cases[key] : ['Impossible de traiter l’abonnement. Réessayez.',503]
  return NextResponse.json({error:text,code:key ?? 'BILLING_UNAVAILABLE'},{status})
}
