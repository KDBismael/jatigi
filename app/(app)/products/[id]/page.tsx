'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { AddStockModal } from '@/components/products/add-stock-modal'
import { formatCurrency, formatDate, computeMargin } from '@/lib/utils'
import type { Product } from '@/types/product'
import type { StockLot } from '@/types/stock-lot'
import { useAuthStore } from '@/stores/auth-store'
import { useProductStore } from '@/stores/product-store'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const isAdmin = useAuthStore((s) => s.isAdmin())
  const updateStoreProduct = useProductStore((s) => s.updateProduct)
  const [product, setProduct] = useState<Product | null>(null)
  const [lots, setLots] = useState<StockLot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddStock, setShowAddStock] = useState(false)

  // Edit state
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editQty, setEditQty] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function fetchData() {
    const [productRes, lotsRes] = await Promise.all([
      fetch(`/api/products/${id}`),
      isAdmin ? fetch(`/api/products/${id}/lots`) : Promise.resolve(null),
    ])
    if (productRes.ok) {
      const fresh: Product = await productRes.json()
      setProduct(fresh)
      // Sync the shared Zustand store so the catalog stays in sync
      updateStoreProduct(fresh.id, fresh)
    }
    if (lotsRes?.ok) setLots(await lotsRes.json())
    setIsLoading(false)
  }

  useEffect(() => { fetchData() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  function startEdit() {
    if (!product) return
    setEditName(product.name)
    setEditPrice(String(product.sale_price))
    setEditQty(String(product.stock_quantity))
    setSaveError(null)
    setIsEditing(true)
  }

  async function saveEdit() {
    if (!product) return
    setIsSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          sale_price: Number(editPrice),
          stock_quantity: Number(editQty),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setSaveError(err.error ?? 'Erreur serveur')
        return
      }
      const updated = await res.json()
      setProduct(updated)
      updateStoreProduct(updated.id, updated)
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

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
        </div>
        {isAdmin && !isEditing && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={startEdit}>Modifier</Button>
            <Button size="sm" onClick={() => setShowAddStock(true)}>+ Ajouter un stock</Button>
          </div>
        )}
      </div>

      {/* Inline edit form */}
      {isEditing && isAdmin && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Modifier le produit</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Nom du produit"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Prix de vente (FCFA)"
                type="number"
                min={0}
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
              />
              <Input
                label="Stock actuel (unités)"
                type="number"
                min={0}
                value={editQty}
                onChange={(e) => setEditQty(e.target.value)}
              />
            </div>
            {saveError && (
              <p className="text-sm text-red-600">{saveError}</p>
            )}
            <div className="flex gap-2">
              <Button onClick={saveEdit} disabled={isSaving}>
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
              <Button variant="secondary" onClick={() => setIsEditing(false)} disabled={isSaving}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Cost breakdown — admin only */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Détail des coûts (dernier lot)</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Achat / unité</p>
                <p className="font-semibold text-gray-900 mt-0.5">{formatCurrency(product.purchase_cost)}</p>
              </div>
              <div>
                <p className="text-gray-500">Transport / unité</p>
                <p className="font-semibold text-gray-900 mt-0.5">{formatCurrency(product.import_cost)}</p>
              </div>
              <div>
                <p className="text-gray-500">Emballage / unité</p>
                <p className="font-semibold text-gray-900 mt-0.5">{formatCurrency(product.packaging_cost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stock lots history — admin only */}
      {isAdmin && lots.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Historique des approvisionnements</h2>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="pb-2 pr-4 font-medium text-gray-500">Date</th>
                  <th className="pb-2 pr-4 font-medium text-gray-500 text-right">Reçu</th>
                  <th className="pb-2 pr-4 font-medium text-gray-500 text-right">Disponible</th>
                  <th className="pb-2 pr-4 font-medium text-gray-500 text-right">Coût/unité</th>
                  <th className="pb-2 font-medium text-gray-500 text-right">Prix vente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lots.map((lot) => (
                  <tr key={lot.id}>
                    <td className="py-2.5 pr-4 text-gray-700">{formatDate(lot.received_at)}</td>
                    <td className="py-2.5 pr-4 text-gray-600 text-right">{lot.quantity_received}</td>
                    <td className="py-2.5 pr-4 text-right">
                      <span className={`font-medium ${lot.quantity_available > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                        {lot.quantity_available}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right font-medium text-gray-900">
                      {formatCurrency(lot.unit_cost)}
                    </td>
                    <td className="py-2.5 text-right font-medium text-indigo-600">
                      {lot.sale_price > 0 ? formatCurrency(lot.sale_price) : '—'}
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
          salePrice={product.sale_price}
          onSuccess={(qty) => {
            setProduct((p) => p ? { ...p, stock_quantity: p.stock_quantity + qty } : p)
            fetchData()
            setShowAddStock(false)
          }}
          onClose={() => setShowAddStock(false)}
        />
      )}
    </div>
  )
}
