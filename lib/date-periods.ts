export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'last7d'
  | 'last30d'
  | 'thisMonth'
  | 'lastMonth'
  | 'custom'

export interface DateRange {
  dateFrom: string // 'YYYY-MM-DD'
  dateTo: string   // 'YYYY-MM-DD'
}

export const PRESET_LABELS: Record<DatePreset, string> = {
  today:     "Aujourd'hui",
  yesterday: 'Hier',
  last7d:    '7 jours',
  last30d:   '30 jours',
  thisMonth: 'Ce mois',
  lastMonth: 'Mois dernier',
  custom:    'Personnalisé',
}

export function formatISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getPeriodDates(
  preset: DatePreset,
  customFrom?: string,
  customTo?: string,
): DateRange {
  if (preset === 'custom') {
    if (!customFrom || !customTo) throw new Error('MISSING_CUSTOM_DATES')
    return { dateFrom: customFrom, dateTo: customTo }
  }

  const today = new Date()
  const todayStr = formatISODate(today)

  const daysAgo = (n: number): string => {
    const d = new Date(today)
    d.setDate(d.getDate() - n)
    return formatISODate(d)
  }

  switch (preset) {
    case 'today':
      return { dateFrom: todayStr, dateTo: todayStr }

    case 'yesterday': {
      const y = daysAgo(1)
      return { dateFrom: y, dateTo: y }
    }

    case 'last7d':
      return { dateFrom: daysAgo(7), dateTo: todayStr }

    case 'last30d':
      return { dateFrom: daysAgo(30), dateTo: todayStr }

    case 'thisMonth': {
      const first = new Date(today.getFullYear(), today.getMonth(), 1)
      return { dateFrom: formatISODate(first), dateTo: todayStr }
    }

    case 'lastMonth': {
      const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastOfPrevMonth = new Date(firstOfThisMonth.getTime() - 1) // day before
      const firstOfPrevMonth = new Date(lastOfPrevMonth.getFullYear(), lastOfPrevMonth.getMonth(), 1)
      return {
        dateFrom: formatISODate(firstOfPrevMonth),
        dateTo: formatISODate(lastOfPrevMonth),
      }
    }
  }
}
