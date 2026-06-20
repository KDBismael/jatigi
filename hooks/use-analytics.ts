'use client'

import { useEffect, useState } from 'react'
import type { DashboardStats, ProductPerformance, ChannelStat, RevenueByPeriod } from '@/types/analytics'
import type { DateRange } from '@/lib/date-periods'

interface AnalyticsData {
  stats: DashboardStats
  products: ProductPerformance[]
  channels: ChannelStat[]
  revenue: RevenueByPeriod[]
}

export function useAnalytics(range: DateRange) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    fetch(`/api/analytics?from=${range.dateFrom}&to=${range.dateTo}`)
      .then((r) => {
        if (!r.ok) throw new Error('Accès refusé')
        return r.json()
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false))
  }, [range.dateFrom, range.dateTo])

  return { data, isLoading, error }
}
