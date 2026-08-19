'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { computeMargin, formatCurrency } from '@/lib/utils'
import type { Product } from '@/types/product'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { AddStockModal } from './add-stock-modal'
import { useProductStore } from '@/stores/product-store'
import { MobileMetric, MobileRecordCard } from '@/components/ui/mobile-record-card'

interface ProductTableProps {
  products: Product[]
  mode?: 'active' | 'archived'
  onDelete?: (id: string) => Promise<{ deleted: boolean; product?: Product; message: string }>
  onToggleActive?: (id: string, isActive: boolean) => Promise<Product>
}

export function ProductTable({ products, mode = 'active', onDelete, onToggleActive }: ProductTableProps) {
  const [addStockProduct, setAddStockProduct] = useState<Product | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const { updateProduct } = useProductStore()
  const router = useRouter()

  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {mode === 'archived' ? 'Aucun produit archivé.' : 'Aucun produit. Ajoutez votre premier produit.'}
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
      <div className="space-y-3 sm:hidden">{products.map(p=>{const totalCost=p.purchase_cost+p.import_cost+p.packaging_cost;const margin=computeMargin({sale_price:p.sale_price,purchase_cost:p.purchase_cost,import_cost:p.import_cost,packaging_cost:p.packaging_cost});const pricing=p.pricing_mode==='unit'?formatCurrency(p.sale_price):p.pricing_mode==='offers'?`${(p.offers??[]).filter(o=>o.is_active).length} offre(s)`:`${formatCurrency(p.sale_price)} + offres`;return <MobileRecordCard key={p.id} onClick={()=>router.push(`/products/${p.id}`)}><div className="flex items-start justify-between gap-3"><p className="font-semibold text-gray-900">{p.name}</p><span className={`rounded-full px-2 py-1 text-xs font-medium ${p.is_active?(p.stock_quantity>5?'bg-green-100 text-green-800':p.stock_quantity>0?'bg-yellow-100 text-yellow-800':'bg-red-100 text-red-800'):'bg-gray-100 text-gray-700'}`}>{p.is_active?`${p.stock_quantity} unités`:'Archivé'}</span></div><div className="mt-4 grid grid-cols-3 gap-2"><MobileMetric label="Tarification" value={pricing}/><MobileMetric label="Coût" value={formatCurrency(totalCost)}/><MobileMetric label="Marge unité" value={p.pricing_mode==='offers'?'—':<span className={margin>=0?'text-green-600':'text-red-600'}>{formatCurrency(margin)}</span>}/></div><div className="mt-4 flex gap-2 border-t border-gray-100 pt-3" onClick={e=>e.stopPropagation()}>{p.is_active&&<Button variant="secondary" className="min-h-11 flex-1" onClick={()=>setAddStockProduct(p)}>+ Stock</Button>}{!p.is_active&&onToggleActive&&<Button variant="secondary" className="min-h-11 flex-1" onClick={()=>onToggleActive(p.id,true)}>Réactiver</Button>}{onDelete&&p.is_active&&<Button variant="secondary" className="min-h-11 flex-1 border-red-300 text-red-600 hover:bg-red-50" onClick={()=>setDeleteTarget(p)}>Supprimer</Button>}</div></MobileRecordCard>})}</div>
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="pb-3 pr-4 font-medium text-gray-600">Produit</th>
              <th className="pb-3 pr-4 font-medium text-gray-600">Tarification</th>
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
                  <td className="py-3 pr-4 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      {p.name}
                      {!p.is_active && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">Archivé</span>}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-gray-700">{p.pricing_mode==='offers'?`${(p.offers??[]).filter(o=>o.is_active).length} offre(s)`:p.pricing_mode==='both'?`${formatCurrency(p.sale_price)} + offres`:formatCurrency(p.sale_price)}</td>
                  <td className="py-3 pr-4 text-gray-700">{formatCurrency(totalCost)}</td>
                  <td className="py-3 pr-4">
                    {p.pricing_mode === 'offers' ? <span className="text-gray-400">Par offre</span> :
                      <span className={`font-semibold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(margin)}</span>}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        !p.is_active
                          ? 'bg-gray-100 text-gray-700'
                          : p.stock_quantity > 5
                          ? 'bg-green-100 text-green-800'
                          : p.stock_quantity > 0
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {p.is_active ? `${p.stock_quantity} unités` : 'Archivé'}
                    </span>
                  </td>
                  <td className="py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      {p.is_active && <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setAddStockProduct(p)}
                      >
                        + Stock
                      </Button>}
                      {!p.is_active && onToggleActive && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onToggleActive(p.id, true)}
                        >
                          Réactiver
                        </Button>
                      )}
                      {onDelete && p.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(p) }}
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

      {deleteTarget && (
        <ConfirmDialog
          title={`Supprimer "${deleteTarget.name}" ?`}
          message="Si ce produit a déjà été vendu, il sera archivé pour préserver l’historique. Sinon, il sera supprimé définitivement avec ses lots de stock."
          confirmLabel="Supprimer"
          cancelLabel="Annuler"
          variant="danger"
          onConfirm={async () => { const result = await onDelete?.(deleteTarget.id); if (result?.message) alert(result.message); setDeleteTarget(null) }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  )
}
