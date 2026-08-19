import { createAdminClient } from '@/services/supabase/server'
import type { ProductOffer } from '@/types/product'
import type { ProductOfferInput } from '@/lib/schemas/product.schema'

async function assertProduct(productId: string, organizationId: string) {
  const db = await createAdminClient()
  const { data } = await db.from('products').select('id').eq('id', productId)
    .eq('organization_id', organizationId).single()
  if (!data) throw new Error('Produit introuvable')
}

export async function createProductOffer(productId: string, input: ProductOfferInput, organizationId: string) {
  await assertProduct(productId, organizationId)
  const db = await createAdminClient()
  const { data, error } = await db.from('product_offers').insert({
    ...input, product_id: productId, organization_id: organizationId,
  }).select().single()
  if (error) throw new Error(error.message)
  return data as ProductOffer
}

export async function updateProductOffer(
  productId: string, offerId: string, input: Partial<ProductOfferInput> & { is_active?: boolean }, organizationId: string,
) {
  const db = await createAdminClient()
  const { data, error } = await db.from('product_offers').update(input).eq('id', offerId)
    .eq('product_id', productId).eq('organization_id', organizationId).select().single()
  if (error) throw new Error(error.message)
  return data as ProductOffer
}

export async function deleteProductOffer(productId: string, offerId: string, organizationId: string) {
  const db = await createAdminClient()
  const { count, error: historyError } = await db.from('order_lines').select('id', { count: 'exact', head: true })
    .eq('product_offer_id', offerId).eq('product_id', productId)
  if (historyError) throw new Error(historyError.message)
  if ((count ?? 0) > 0) {
    const offer = await updateProductOffer(productId, offerId, { is_active: false }, organizationId)
    return { deleted: false, offer, message: "Cette offre a déjà été vendue. Elle a été désactivée pour préserver l’historique." }
  }
  const { error } = await db.from('product_offers').delete().eq('id', offerId)
    .eq('product_id', productId).eq('organization_id', organizationId)
  if (error) throw new Error(error.message)
  return { deleted: true, message: 'Offre supprimée.' }
}
