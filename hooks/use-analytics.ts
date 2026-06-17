'use client'

import { useEffect, useState } from 'react'
import type { DashboardStats, ProductPerformance, ChannelStat, RevenueByPeriod } from '@/types/analytics'

interface AnalyticsData {
  stats: DashboardStats
  products: ProductPerformance[]
  channels: ChannelStat[]
  revenue: RevenueByPeriod[]
}

export function useAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => {
        if (!r.ok) throw new Error('Accès refusé')
        return r.json()
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false))
  }, [])

  return { data, isLoading, error }
}
