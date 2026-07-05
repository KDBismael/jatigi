import { getOrganizationsOverview } from '@/services/platform-service'
import { Card } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function AdminOrganizationsPage() {
  const orgs = await getOrganizationsOverview()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Organisations</h1>
        <p className="text-gray-500 text-sm mt-1">{orgs.length} organisation(s) inscrite(s).</p>
      </div>

      <Card className="overflow-hidden">
        {/* Mobile: cards */}
        <ul className="divide-y divide-gray-100 sm:hidden">
          {orgs.map((org) => (
            <li key={org.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{org.name}</p>
                  <p className="text-xs text-gray-500 truncate">{org.owner_name ?? 'Propriétaire inconnu'}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{formatDate(org.created_at)}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <span className="text-gray-500">Utilisateurs : <span className="font-medium text-gray-900">{org.users_count}</span></span>
                <span className="text-gray-500">Commandes : <span className="font-medium text-gray-900">{org.orders_count}</span></span>
                <span className="text-gray-500">CA : <span className="font-medium text-gray-900">{formatCurrency(org.revenue)}</span></span>
                <span className="text-gray-500">Collecté : <span className="font-medium text-indigo-600">{formatCurrency(org.delivery_collected)}</span></span>
              </div>
            </li>
          ))}
        </ul>

        {/* Desktop: table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left bg-gray-50">
                <th className="px-4 py-3 font-medium text-gray-600">Organisation</th>
                <th className="px-4 py-3 font-medium text-gray-600">Propriétaire</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Utilisateurs</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Commandes</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Chiffre d’affaires</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Collecté livraisons</th>
                <th className="px-4 py-3 font-medium text-gray-600">Créée le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orgs.map((org) => (
                <tr key={org.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{org.name}</td>
                  <td className="px-4 py-3 text-gray-700">{org.owner_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700 text-right">{org.users_count}</td>
                  <td className="px-4 py-3 text-gray-700 text-right">{org.orders_count}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 text-right">{formatCurrency(org.revenue)}</td>
                  <td className="px-4 py-3 text-indigo-600 text-right">{formatCurrency(org.delivery_collected)}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(org.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
