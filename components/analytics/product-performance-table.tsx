import type { ProductPerformance } from '@/types/analytics'
import { formatCurrency } from '@/lib/utils'

export function ProductPerformanceTable({ data }: { data: ProductPerformance[] }) {
  if (data.length === 0) {
    return <p className="text-center text-gray-400 py-8">Pas encore de données</p>
  }

  return (
    <>
      {/* Mobile: stacked cards */}
      <ul className="space-y-3 sm:hidden">
        {data.map((p) => (
          <li key={p.product_id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-gray-900 leading-snug">{p.product_name}</p>
              <span className="shrink-0 text-xs text-gray-500">{p.total_quantity} unités</span>
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs text-gray-400">Chiffre d&apos;affaires</p>
                <p className="text-sm font-medium text-gray-700">{formatCurrency(p.total_revenue)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Bénéfice</p>
                <p className={p.total_profit >= 0 ? 'text-sm font-semibold text-green-600' : 'text-sm font-semibold text-red-600'}>
                  {formatCurrency(p.total_profit)}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop: table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="pb-3 pr-4 font-medium text-gray-600">Produit</th>
              <th className="pb-3 pr-4 font-medium text-gray-600">Ventes</th>
              <th className="pb-3 pr-4 font-medium text-gray-600">Chiffre d&apos;affaires</th>
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
      </div>
    </>
  )
}
