import { NextResponse } from 'next/server'
import { billingErrorResponse } from '@/lib/billing/access'
const errors: Record<string, [string, number]> = {
  FORBIDDEN: ['Vous n’avez pas les droits pour modifier ces informations.', 403],
  INVALID_PRODUCT_VARIANT: ['Cette variante est introuvable, archivée ou incompatible avec le produit.',400],
  LIVE_SESSION_NOT_ACTIVE: ['La session live doit être démarrée et encore ouverte.',409],
  DELIVERY_ASSIGNMENT_LOCKED: ['La tournée d’une commande livrée ou annulée ne peut plus être déplacée.', 409],
  DELIVERY_DATE_REQUIRED: ['Renseignez la date de tournée du colis confié au livreur.', 400],
  INVALID_DELIVERY_DRIVER: ['Ce livreur est introuvable ou archivé. Choisissez un livreur actif.', 400],
  DISCOUNT_REASON_REQUIRED: ['Le motif de la remise est obligatoire.', 400],
  DISCOUNT_EXCEEDS_LINE: ['La remise dépasse le montant de la ligne.', 400],
  INVALID_DISCOUNT: ['Remise invalide : vérifiez le type et le montant.', 400],
  DEPOSIT_EXCEEDS_TOTAL: ['Le total après remise ne peut pas être inférieur au dépôt déjà payé.', 400],
  DISCOUNTS_LOCKED: ['Les remises sont verrouillées après livraison ou annulation.', 409],
  ORDER_NOT_FOUND: ['Commande introuvable.', 404],
  LINE_NOT_FOUND: ['Ligne de commande introuvable.', 404],
  INSUFFICIENT_STOCK: ['Stock insuffisant pour ce produit.', 400],
  PRODUCT_NOT_FOUND: ['Produit introuvable ou archivé.', 400],
  OFFER_NOT_FOUND: ['Offre introuvable ou inactive.', 400],
}
export function orderErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if(/PLAN_(ORDER|USER|DRIVER)_LIMIT/.test(message)) return billingErrorResponse(error)
  const match = Object.entries(errors).find(([code]) => message.includes(code))?.[1]
  return NextResponse.json({ error: match?.[0] ?? 'Impossible d’enregistrer la commande. Réessayez.' }, { status: match?.[1] ?? 500 })
}
