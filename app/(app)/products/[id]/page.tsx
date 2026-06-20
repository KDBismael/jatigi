'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AddStockModal } from '@/components/products/add-stock-modal'
import { formatCurrency, formatDate, computeMargin } from '@/lib/utils'
import type { Product } from '@/types/product'
import type { StockLot } from '@/types/stock-lot'
import { useAuthStore } from '@/stores/auth-store'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const isAdmin = useAuthStore((s) => s.isAdmin())
  const [product, setProduct] = useState<Product | null>(null)
  const [lots, setLots] = useState<StockLot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddStock, setShowAddStock] = useState(false)

  async function fetchData() {
    const [productRes, lotsRes] = await Promise.all([
      fetch(`/api/products/${id}`),
      isAdmin ? fetch(`/api/products/${id}/lots`) : Promise.resolve(null),
    ])
    if (productRes.ok) setProduct(await productRes.json())
    if (lotsRes?.ok) setLots(await lotsRes.json())
    setIsLoading(false)
  }

  useEffect(() => { fetchData() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-36" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-16 text-gray-500">
        Produit introuvable.
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mt-4 block mx-auto">
          ← Retour
        </Button>
      </div>
    )
  }

  const margin = computeMargin({
    sale_price: product.sale_price,
    purchase_cost: product.purchase_cost,
    import_cost: product.import_cost,
    packaging_cost: product.packaging_cost,
  })

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>←</Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Référence produit</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowAddStock(true)} size="sm">
            + Ajouter un stock
          </Button>
        )}
      </div>

      {/* Key numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500">Prix de vente</p>
            <p className="text-lg font-bold text-indigo-600 mt-1">{formatCurrency(product.sale_price)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500">Coût de revient</p>
            <p className="text-lg font-bold text-gray-700 mt-1">
              {formatCurrency(product.purchase_cost + product.import_cost + product.packaging_cost)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500">Marge unitaire</p>
            <p className={`text-lg font-bold mt-1 ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(margin)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500">Stock disponible</p>
            <p className={`text-lg font-bold mt-1 ${
              product.stock_quantity > 5 ? 'text-green-600'
              : product.stock_quantity > 0 ? 'text-yellow-600'
              : 'text-red-600'
            }`}>
              {product.stock_quantity} unités
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cost breakdown */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Détail des coûts (dernier lot)</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Achat</p>
                <p className="font-semibold text-gray-900 mt-0.5">{formatCurrency(product.purchase_cost)}</p>
              </div>
              <div>
                <p className="text-gray-500">Importation</p>
                <p className="font-semibold text-gray-900 mt-0.5">{formatCurrency(product.import_cost)}</p>
              </div>
              <div>
                <p className="text-gray-500">Emballage</p>
                <p className="font-semibold text-gray-900 mt-0.5">{formatCurrency(product.packaging_cost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stock lots history */}
      {isAdmin && lots.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Historique des lots</h2>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="pb-2 pr-4 font-medium text-gray-500">Date réception</th>
                  <th className="pb-2 pr-4 font-medium text-gray-500 text-right">Reçu</th>
                  <th className="pb-2 pr-4 font-medium text-gray-500 text-right">Disponible</th>
                  <th className="pb-2 font-medium text-gray-500 text-right">Coût/unité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lots.map((lot) => (
                  <tr key={lot.id}>
                    <td className="py-2.5 pr-4 text-gray-700">{formatDate(lot.received_at)}</td>
                    <td className="py-2.5 pr-4 text-gray-600 text-right">{lot.quantity_received}</td>
                    <td className="py-2.5 pr-4 text-right">
                      <span className={`font-medium ${
                        lot.quantity_available > 0 ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {lot.quantity_available}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-medium text-gray-900">
                      {formatCurrency(lot.unit_cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {showAddStock && (
        <AddStockModal
          productName={product.name}
          productId={product.id}
          onSuccess={(qty) => {
            setProduct((p) => p ? { ...p, stock_quantity: p.stock_quantity + qty } : p)
            fetchData() // refresh lots
            setShowAddStock(false)
          }}
          onClose={() => setShowAddStock(false)}
        />
      )}
    </div>
  )
}
