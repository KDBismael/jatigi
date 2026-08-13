import type { Product } from '@/types/product'

export function isProductActive(product: Pick<Product, 'is_active'>): boolean {
  return product.is_active !== false
}

export function splitProductsByStatus(products: Product[]) {
  return {
    active: products.filter(isProductActive),
    archived: products.filter((product) => !isProductActive(product)),
  }
}

export function selectableOrderProducts(products: Product[]) {
  return products.filter(isProductActive)
}
