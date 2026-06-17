'use client'

import Link from 'next/link'
import { useOrders } from '@/hooks/use-orders'
import { OrderTable } from '@/components/orders/order-table'
import { OrderFilters } from '@/components/orders/order-filters'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/auth-store'

export default function OrdersPage() {
  const { orders, filters, isLoading, updateStatus, setFilters } = useOrders()
  const { organization } = useAuthStore()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Commandes</h1>
          <p className="text-gray-500 text-sm mt-1">
            {organization?.name && <span className="text-indigo-600 font-medium">{organization.name} · </span>}
            {orders.length} commande(s)
          </p>
        </div>
        <Link href="/orders/new">
          <Button>+ Nouvelle commande</Button>
        </Link>
      </div>

      <OrderFilters filters={filters} onChange={setFilters} />

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Liste des commandes</h2>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <OrderTable orders={orders} onStatusChange={updateStatus} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
