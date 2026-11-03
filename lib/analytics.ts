import type { ClientEvent, EventProps } from '@/lib/analytics-events'

export type AnalyticsProps = EventProps

const KEY = 'warko.anonymous-id'
let memoryId: string | null = null

/** Random per-browser id; falls back to memory when storage is blocked. */
export function anonymousId(): string {
  try {
    const stored = localStorage.getItem(KEY)
    if (stored) return stored
    const id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
    return id
  } catch {
    memoryId ??= crypto.randomUUID()
    return memoryId
  }
}

/** First-party, fire-and-forget usage event. Never throws, never blocks the UI. */
export function track(event: ClientEvent | string, props: AnalyticsProps = {}) {
  if (typeof window === 'undefined') return
  try {
    const body = JSON.stringify({ name: event, props, path: window.location.pathname.slice(0, 200), anonymous_id: anonymousId() })
    if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon('/api/events', new Blob([body], { type: 'application/json' }))) return
    void fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {})
  } catch {
    // Analytics must never break a page.
  }
}

/** utm_source first, otherwise the referring site's domain; null for direct visits. */
export function trafficSource(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const utm = new URLSearchParams(window.location.search).get('utm_source')?.trim().toLowerCase()
    if (utm) return utm.slice(0, 40)
    const referrer = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : ''
    return referrer && referrer !== window.location.hostname.replace(/^www\./, '') ? referrer.slice(0, 40) : null
  } catch {
    return null
  }
}
