import { NextResponse } from 'next/server'
const errors: Record<string, [string, number]> = {
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
  const match = Object.entries(errors).find(([code]) => message.includes(code))?.[1]
  return NextResponse.json({ error: match?.[0] ?? 'Impossible d’enregistrer la commande. Réessayez.' }, { status: match?.[1] ?? 500 })
}
