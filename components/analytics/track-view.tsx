'use client'
import { useEffect } from 'react'
import { track, trafficSource } from '@/lib/analytics'
import type { ClientEvent } from '@/lib/analytics-events'

/** Records one page view; the landing also records where the visitor came from. */
export function TrackView({ event, withSource = false }: { event: ClientEvent; withSource?: boolean }) {
  useEffect(() => {
    const source = withSource ? trafficSource() : null
    track(event, source ? { source } : {})
  }, [event, withSource])
  return null
}
