import type { ProductOffer } from '@/types/product'

export function calculateUnitSale(unitPrice: number, unitCount: number) {
  return { stockQuantity: unitCount, revenue: unitPrice * unitCount }
}

export function calculateOfferSale(
  offer: Pick<ProductOffer, 'units_per_offer' | 'price'>,
  offerCount: number,
) {
  return {
    stockQuantity: offer.units_per_offer * offerCount,
    revenue: Number(offer.price) * offerCount,
  }
}
