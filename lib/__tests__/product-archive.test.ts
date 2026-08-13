import { describe, expect, it } from 'vitest'
import { isProductActive, selectableOrderProducts, splitProductsByStatus } from '@/lib/product-archive'
import type { Product } from '@/types/product'

function product(id: string, is_active: boolean): Product {
  return {
    id,
    name: `Produit ${id}`,
    purchase_cost: 0,
    import_cost: 0,
    import_cost_type: 'lot',
    import_cost_raw: 0,
    import_batch_size: null,
    packaging_cost: 0,
    sale_price: 1_000,
    stock_quantity: 0,
    is_active,
    created_at: '2026-08-13T00:00:00Z',
    updated_at: '2026-08-13T00:00:00Z',
  }
}

describe('product archiving helpers', () => {
  it('considère seulement false comme archivé', () => {
    expect(isProductActive(product('a', true))).toBe(true)
    expect(isProductActive(product('b', false))).toBe(false)
  })

  it('sépare les produits actifs et archivés', () => {
    const result = splitProductsByStatus([product('a', true), product('b', false)])
    expect(result.active.map((p) => p.id)).toEqual(['a'])
    expect(result.archived.map((p) => p.id)).toEqual(['b'])
  })

  it('masque les produits archivés des nouvelles commandes', () => {
    expect(selectableOrderProducts([product('a', true), product('b', false)]).map((p) => p.id)).toEqual(['a'])
  })
})
