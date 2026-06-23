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
    const controller = new AbortController()
    void Promise.resolve().then(async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/analytics?from=${range.dateFrom}&to=${range.dateTo}`, { signal: controller.signal })
        if (!response.ok) throw new Error('Accès refusé')
        setData(await response.json())
      } catch (caught) {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'Erreur inconnue')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    })
    return () => controller.abort()
  }, [range.dateFrom, range.dateTo])

  return { data, isLoading, error }
}
