'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useProducts } from '@/hooks/use-products'
import { ProductTable } from '@/components/products/product-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { splitProductsByStatus } from '@/lib/product-archive'

export default function ProductsPage() {
  const { products, isLoading, remove, update } = useProducts()
  const [tab, setTab] = useState<'active' | 'archived'>('active')
  const { active: activeProducts, archived: archivedProducts } = splitProductsByStatus(products)
  const visibleProducts = tab === 'active' ? activeProducts : archivedProducts

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produits</h1>
          <p className="text-gray-500 text-sm mt-1">{activeProducts.length} actif(s) · {archivedProducts.length} archivé(s)</p>
        </div>
        <Link href="/products/new">
          <Button>+ Ajouter un produit</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-gray-900">Catalogue</h2>
            <div className="flex rounded-lg bg-gray-100 p-1 text-sm">
              <button
                type="button"
                onClick={() => setTab('active')}
                className={`rounded-md px-3 py-1.5 ${tab === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                Actifs ({activeProducts.length})
              </button>
              <button
                type="button"
                onClick={() => setTab('archived')}
                className={`rounded-md px-3 py-1.5 ${tab === 'archived' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                Archivés ({archivedProducts.length})
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <ProductTable
              products={visibleProducts}
              mode={tab}
              onDelete={remove}
              onToggleActive={(id, isActive) => update(id, { is_active: isActive })}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
