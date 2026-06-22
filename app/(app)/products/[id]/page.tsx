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

  // Product edit state
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editQty, setEditQty] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Lot edit state
  const [editingLotId, setEditingLotId] = useState<string | null>(null)
  const [lotEditSalePrice, setLotEditSalePrice] = useState('')
  const [lotEditQtyAvail, setLotEditQtyAvail] = useState('')
  const [lotEditPurchase, setLotEditPurchase] = useState('')
  const [lotEditTransport, setLotEditTransport] = useState('')
  const [lotEditPackaging, setLotEditPackaging] = useState('')
  const [isSavingLot, setIsSavingLot] = useState(false)
  const [lotSaveError, setLotSaveError] = useState<string | null>(null)

  async function fetchData() {
    // Always fetch both — server handles auth (403 for non-admins on lots)
    // Avoids the race where isAdmin is still false when the effect fires on reload
    const [productRes, lotsRes] = await Promise.all([
      fetch(`/api/products/${id}`),
      fetch(`/api/products/${id}/lots`),
    ])
    if (productRes.ok) {
      const fresh: Product = await productRes.json()
      setProduct(fresh)
      updateStoreProduct(fresh.id, fresh)
    }
    if (lotsRes.ok) setLots(await lotsRes.json()) // 403 → not ok → lots stay empty
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

  function startEditLot(lot: (typeof lots)[number]) {
    setEditingLotId(lot.id)
    setLotEditSalePrice(String(lot.sale_price ?? ''))
    setLotEditQtyAvail(String(lot.quantity_available))
    // Reconstruct totals from per-unit × qty_received
    setLotEditPurchase(String(Math.round(lot.purchase_cost * lot.quantity_received)))
    setLotEditTransport(String(Math.round(lot.import_cost * lot.quantity_received)))
    setLotEditPackaging(String(Math.round(lot.packaging_cost * lot.quantity_received)))
    setLotSaveError(null)
  }

  async function saveLot() {
    if (!editingLotId) return
    setIsSavingLot(true)
    setLotSaveError(null)
    try {
      const res = await fetch(`/api/products/${id}/lots/${editingLotId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sale_price: Number(lotEditSalePrice),
          quantity_available: Number(lotEditQtyAvail),
          total_purchase: Number(lotEditPurchase),
          total_transport: Number(lotEditTransport),
          total_packaging: Number(lotEditPackaging),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setLotSaveError(err.error ?? 'Erreur serveur')
        return
      }
      setEditingLotId(null)
      fetchData()
    } finally {
      setIsSavingLot(false)
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
            <div>
              <h2 className="font-semibold text-gray-900">Coûts unitaires actuels</h2>
              <p className="text-xs text-gray-400 mt-0.5">Basés sur le dernier lot ajouté</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-sm">
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
              <div className="border-l border-gray-100 pl-4">
                <p className="text-gray-500">Total / unité</p>
                <p className="font-bold text-gray-900 mt-0.5">
                  {formatCurrency(product.purchase_cost + product.import_cost + product.packaging_cost)}
                </p>
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
          <CardContent className="space-y-3">
            {lots.map((lot) => {
              const isEditingThis = editingLotId === lot.id
              return (
                <div key={lot.id} className="border border-gray-100 rounded-lg overflow-hidden">
                  {/* Summary row — always visible */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
                    <span className="text-sm text-gray-600 w-24 shrink-0">{formatDate(lot.received_at)}</span>
                    <span className="text-sm text-gray-600">{lot.quantity_received} reçus</span>
                    <span className={`text-sm font-medium ${lot.quantity_available > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      · {lot.quantity_available} dispo
                    </span>
                    <span className="text-sm text-gray-700 ml-auto">
                      Coût : <strong>{formatCurrency(lot.unit_cost)}</strong>
                    </span>
                    <span className="text-sm text-indigo-600">
                      Vente : <strong>{lot.sale_price > 0 ? formatCurrency(lot.sale_price) : '—'}</strong>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => isEditingThis ? setEditingLotId(null) : startEditLot(lot)}
                      className="text-xs shrink-0"
                    >
                      {isEditingThis ? 'Annuler' : 'Modifier'}
                    </Button>
                  </div>

                  {/* Inline edit form */}
                  {isEditingThis && (
                    <div className="px-4 py-4 space-y-3 border-t border-gray-100">
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="Prix de vente (FCFA)"
                          type="number"
                          min={0}
                          value={lotEditSalePrice}
                          onChange={(e) => setLotEditSalePrice(e.target.value)}
                        />
                        <Input
                          label="Stock disponible (unités)"
                          type="number"
                          min={0}
                          value={lotEditQtyAvail}
                          onChange={(e) => setLotEditQtyAvail(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <Input
                          label="Total achat (FCFA)"
                          type="number"
                          min={0}
                          value={lotEditPurchase}
                          onChange={(e) => setLotEditPurchase(e.target.value)}
                        />
                        <Input
                          label="Total transport (FCFA)"
                          type="number"
                          min={0}
                          value={lotEditTransport}
                          onChange={(e) => setLotEditTransport(e.target.value)}
                        />
                        <Input
                          label="Total emballage (FCFA)"
                          type="number"
                          min={0}
                          value={lotEditPackaging}
                          onChange={(e) => setLotEditPackaging(e.target.value)}
                        />
                      </div>
                      {lotSaveError && <p className="text-xs text-red-600">{lotSaveError}</p>}
                      <Button size="sm" onClick={saveLot} disabled={isSavingLot}>
                        {isSavingLot ? 'Enregistrement...' : 'Enregistrer ce lot'}
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
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
