import type { ProductPerformance } from '@/types/analytics'
import { formatCurrency } from '@/lib/utils'

export function ProductPerformanceTable({ data }: { data: ProductPerformance[] }) {
  if (data.length === 0) {
    return <p className="text-center text-gray-400 py-8">Pas encore de données</p>
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left">
          <th className="pb-3 pr-4 font-medium text-gray-600">Produit</th>
          <th className="pb-3 pr-4 font-medium text-gray-600">Ventes</th>
          <th className="pb-3 pr-4 font-medium text-gray-600">Chiffre d'affaires</th>
          <th className="pb-3 font-medium text-gray-600">Bénéfice</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {data.map((p) => (
          <tr key={p.product_id} className="hover:bg-gray-50">
            <td className="py-3 pr-4 font-medium text-gray-900">{p.product_name}</td>
            <td className="py-3 pr-4 text-gray-700">{p.total_quantity} unités</td>
            <td className="py-3 pr-4 text-gray-700">{formatCurrency(p.total_revenue)}</td>
            <td className="py-3">
              <span className={p.total_profit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                {formatCurrency(p.total_profit)}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
