'use client'

import { useAnalytics } from '@/hooks/use-analytics'
import { ProductPerformanceTable } from '@/components/analytics/product-performance-table'
import { ChannelChart } from '@/components/analytics/channel-chart'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'

export default function AnalyticsPage() {
  const { data, isLoading } = useAnalytics()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    )
  }

  if (!data) return null

  const { products, channels } = data
  const bestSelling = products[0]
  const mostProfitable = [...products].sort((a, b) => b.total_profit - a.total_profit)[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analyses</h1>
        <p className="text-gray-500 text-sm mt-1">Performances de vos produits et canaux</p>
      </div>

      {bestSelling && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500 font-medium">Produit le plus vendu</p>
              <p className="text-xl font-bold text-indigo-600 mt-1">{bestSelling.product_name}</p>
              <p className="text-xs text-gray-400">{bestSelling.total_quantity} unités vendues</p>
            </CardContent>
          </Card>
          {mostProfitable && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500 font-medium">Produit le plus rentable</p>
                <p className="text-xl font-bold text-green-600 mt-1">{mostProfitable.product_name}</p>
                <p className="text-xs text-gray-400">{formatCurrency(mostProfitable.total_profit)} de bénéfice</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Performance par produit</h2>
        </CardHeader>
        <CardContent>
          <ProductPerformanceTable data={products} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Commandes par canal</h2>
        </CardHeader>
        <CardContent>
          <ChannelChart data={channels} />
        </CardContent>
      </Card>
    </div>
  )
}
