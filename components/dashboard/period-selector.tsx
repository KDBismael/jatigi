'use client'

import { cn } from '@/lib/utils'
import { type DatePreset, PRESET_LABELS } from '@/lib/date-periods'
import { Input } from '@/components/ui/input'

const PRESETS: DatePreset[] = [
  'today', 'yesterday', 'last7d', 'last30d', 'thisMonth', 'lastMonth', 'custom',
]

interface PeriodSelectorProps {
  preset: DatePreset
  customFrom?: string
  customTo?: string
  onChange: (preset: DatePreset, customFrom?: string, customTo?: string) => void
}

export function PeriodSelector({ preset, customFrom, customTo, onChange }: PeriodSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p, customFrom, customTo)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-full border transition-colors',
              preset === p
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600',
            )}
          >
            {PRESET_LABELS[p]}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <div className="flex items-center gap-3">
          <Input
            label="Du"
            type="date"
            value={customFrom ?? ''}
            onChange={(e) => onChange('custom', e.target.value, customTo)}
            className="w-44"
          />
          <Input
            label="Au"
            type="date"
            value={customTo ?? ''}
            onChange={(e) => onChange('custom', customFrom, e.target.value)}
            className="w-44"
          />
        </div>
      )}
    </div>
  )
}
