'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { computeMargin, formatCurrency } from '@/lib/utils'
import type { Product } from '@/types/product'
import { Button } from '@/components/ui/button'
import { AddStockModal } from './add-stock-modal'
import { useProductStore } from '@/stores/product-store'

interface ProductTableProps {
  products: Product[]
  onDelete?: (id: string) => void
}

export function ProductTable({ products, onDelete }: ProductTableProps) {
  const [addStockProduct, setAddStockProduct] = useState<Product | null>(null)
  const { updateProduct } = useProductStore()
  const router = useRouter()

  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        Aucun produit. Ajoutez votre premier produit.
      </div>
    )
  }

  function handleStockAdded(product: Product, addedQuantity: number) {
    // Optimistically update the store so the table refreshes immediately
    updateProduct(product.id, { stock_quantity: product.stock_quantity + addedQuantity })
    setAddStockProduct(null)
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="pb-3 pr-4 font-medium text-gray-600">Produit</th>
              <th className="pb-3 pr-4 font-medium text-gray-600">Prix vente</th>
              <th className="pb-3 pr-4 font-medium text-gray-600">Coût total</th>
              <th className="pb-3 pr-4 font-medium text-gray-600">Marge</th>
              <th className="pb-3 pr-4 font-medium text-gray-600">Stock</th>
              <th className="pb-3 font-medium text-gray-600"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map((p) => {
              const totalCost = p.purchase_cost + p.import_cost + p.packaging_cost
              const margin = computeMargin({
                sale_price: p.sale_price,
                purchase_cost: p.purchase_cost,
                import_cost: p.import_cost,
                packaging_cost: p.packaging_cost,
              })
              return (
                <tr
                key={p.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push(`/products/${p.id}`)}
              >
                  <td className="py-3 pr-4 font-medium text-gray-900">{p.name}</td>
                  <td className="py-3 pr-4 text-gray-700">{formatCurrency(p.sale_price)}</td>
                  <td className="py-3 pr-4 text-gray-700">{formatCurrency(totalCost)}</td>
                  <td className="py-3 pr-4">
                    <span className={`font-semibold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(margin)}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        p.stock_quantity > 5
                          ? 'bg-green-100 text-green-800'
                          : p.stock_quantity > 0
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {p.stock_quantity} unités
                    </span>
                  </td>
                  <td className="py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setAddStockProduct(p)}
                      >
                        + Stock
                      </Button>
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(p.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Supprimer
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {addStockProduct && (
        <AddStockModal
          productName={addStockProduct.name}
          productId={addStockProduct.id}
          onSuccess={(qty) => handleStockAdded(addStockProduct, qty)}
          onClose={() => setAddStockProduct(null)}
        />
      )}
    </>
  )
}
