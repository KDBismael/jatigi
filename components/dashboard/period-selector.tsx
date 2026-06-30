'use client'

import { useState } from 'react'
import { cn, formatDate } from '@/lib/utils'
import { type DatePreset, PRESET_LABELS } from '@/lib/date-periods'
import { DateRangeDialog } from '@/components/dashboard/date-range-dialog'

const PRESETS: DatePreset[] = [
  'today', 'yesterday', 'last7d', 'last30d', 'thisMonth', 'lastMonth',
]

interface PeriodSelectorProps {
  preset: DatePreset
  customFrom?: string
  customTo?: string
  onChange: (preset: DatePreset, customFrom?: string, customTo?: string) => void
}

export function PeriodSelector({ preset, customFrom, customTo, onChange }: PeriodSelectorProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const customActive = preset === 'custom'
  const customLabel = customActive && customFrom && customTo
    ? `${formatDate(customFrom)} → ${formatDate(customTo)}`
    : 'Personnalisé'

  return (
    <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="inline-flex items-center gap-1 bg-gray-100 rounded-2xl p-1.5 min-w-max">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={cn(
              'shrink-0 px-4 py-2 text-sm font-medium rounded-xl transition-colors whitespace-nowrap',
              preset === p
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900',
            )}
          >
            {PRESET_LABELS[p]}
          </button>
        ))}

        {/* Divider */}
        <span className="shrink-0 w-px h-6 bg-gray-300 mx-1" />

        {/* Custom range — outlined button */}
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className={cn(
            'shrink-0 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border transition-colors whitespace-nowrap',
            customActive
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-indigo-600 border-indigo-300 hover:border-indigo-500',
          )}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          {customLabel}
        </button>
      </div>

      {dialogOpen && (
        <DateRangeDialog
          initialFrom={customFrom}
          initialTo={customTo}
          onApply={(from, to) => {
            onChange('custom', from, to)
            setDialogOpen(false)
          }}
          onCancel={() => setDialogOpen(false)}
        />
      )}
    </div>
  )
}
