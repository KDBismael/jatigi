'use client'

import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { STATUSES, STATUS_LABELS, type OrderStatus } from '@/lib/constants'

interface OrderFiltersProps {
  filters: { status?: OrderStatus | ''; dateFrom?: string; dateTo?: string; search?: string; deliverySearch?: string }
  onChange: (f: { status?: OrderStatus | ''; dateFrom?: string; dateTo?: string; search?: string; deliverySearch?: string }) => void
}

const statusOptions = [
  { value: '', label: 'Tous les statuts' },
  ...STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
]

export function OrderFilters({ filters, onChange }: OrderFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <div className="w-56">
        <Input
          placeholder="Rechercher un client..."
          value={filters.search ?? ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </div>
      <div className="w-56">
        <Input
          placeholder="Rechercher un livreur..."
          value={filters.deliverySearch ?? ''}
          onChange={(e) => onChange({ ...filters, deliverySearch: e.target.value })}
        />
      </div>
      <div className="w-44">
        <Select
          options={statusOptions}
          value={filters.status ?? ''}
          onChange={(e) => onChange({ ...filters, status: e.target.value as OrderStatus | '' })}
        />
      </div>
    </div>
  )
}
