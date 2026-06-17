'use client'

import Link from 'next/link'
import { useProducts } from '@/hooks/use-products'
import { ProductTable } from '@/components/products/product-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function ProductsPage() {
  const { products, isLoading, remove } = useProducts()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produits</h1>
          <p className="text-gray-500 text-sm mt-1">{products.length} produit(s)</p>
        </div>
        <Link href="/products/new">
          <Button>+ Ajouter un produit</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Catalogue</h2>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <ProductTable products={products} onDelete={remove} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
