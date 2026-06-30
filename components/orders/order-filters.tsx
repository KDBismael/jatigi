'use client'

import { STATUSES, STATUS_LABELS, type OrderStatus } from '@/lib/constants'

interface OrderFiltersProps {
  filters: { status?: OrderStatus | ''; dateFrom?: string; dateTo?: string; search?: string; deliverySearch?: string }
  onChange: (f: { status?: OrderStatus | ''; dateFrom?: string; dateTo?: string; search?: string; deliverySearch?: string }) => void
}

const statusOptions = [
  { value: '', label: 'Tous les statuts' },
  ...STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
]

// Card wrapper: a white card with label on mobile, transparent inline on desktop.
const cardClass =
  'bg-white border border-gray-200 rounded-xl p-4 shadow-sm sm:bg-transparent sm:border-0 sm:p-0 sm:shadow-none'
const labelClass =
  'flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 sm:hidden'
const fieldClass =
  'w-full pl-10 pr-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'

export function OrderFilters({ filters, onChange }: OrderFiltersProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3 mb-6">
      {/* Client */}
      <div className={`${cardClass} sm:w-56`}>
        <label className={labelClass}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
          Client
        </label>
        <div className="relative">
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </Icon>
          <input
            className={fieldClass}
            placeholder="Rechercher un client..."
            value={filters.search ?? ''}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
          />
        </div>
      </div>

      {/* Livreur */}
      <div className={`${cardClass} sm:w-56`}>
        <label className={labelClass}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
          </svg>
          Livreur
        </label>
        <div className="relative">
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </Icon>
          <input
            className={fieldClass}
            placeholder="Rechercher un livreur..."
            value={filters.deliverySearch ?? ''}
            onChange={(e) => onChange({ ...filters, deliverySearch: e.target.value })}
          />
        </div>
      </div>

      {/* Statut */}
      <div className={`${cardClass} sm:w-48`}>
        <label className={labelClass}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
          </svg>
          Statut de la commande
        </label>
        <div className="relative">
          <select
            className="w-full appearance-none pl-3 pr-9 py-2.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            value={filters.status ?? ''}
            onChange={(e) => onChange({ ...filters, status: e.target.value as OrderStatus | '' })}
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <svg className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </div>
    </div>
  )
}

function Icon({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg className={`w-5 h-5 ${className ?? ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      {children}
    </svg>
  )
}
