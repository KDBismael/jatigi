// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { anonymousId, track } from '@/lib/analytics'

beforeEach(() => {
  const stored = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (k: string) => stored.get(k) ?? null, setItem: (k: string, v: string) => void stored.set(k, v) })
})
afterEach(() => vi.unstubAllGlobals())

type Beacon = (url: string, body: Blob) => boolean
const sentBody = async (beacon: { mock: { calls: Parameters<Beacon>[] } }, call = 0) => JSON.parse(await beacon.mock.calls[call][1].text())

it('sends a known event with a stable anonymous id and the current path', async () => {
  const beacon = vi.fn<Beacon>(() => true)
  vi.stubGlobal('navigator', { ...navigator, sendBeacon: beacon })
  track('cta_signup', { location: 'hero' })
  track('landing_view')
  expect(beacon).toHaveBeenCalledTimes(2)
  expect(beacon.mock.calls[0][0]).toBe('/api/events')
  const body = await sentBody(beacon)
  expect(body).toEqual({ name: 'cta_signup', props: { location: 'hero' }, path: '/', anonymous_id: anonymousId() })
  expect((await sentBody(beacon, 1)).anonymous_id).toBe(body.anonymous_id)
})

it('falls back to a keepalive fetch and never throws', () => {
  const fetch = vi.fn(async () => new Response(null, { status: 204 }))
  vi.stubGlobal('navigator', { ...navigator, sendBeacon: undefined })
  vi.stubGlobal('fetch', fetch)
  expect(() => track('signup_view')).not.toThrow()
  expect(fetch).toHaveBeenCalledWith('/api/events', expect.objectContaining({ method: 'POST', keepalive: true }))
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('offline') }))
  expect(() => track('signup_view')).not.toThrow()
})

it('keeps working when storage is blocked', () => {
  vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } })
  const beacon = vi.fn<Beacon>(() => true)
  vi.stubGlobal('navigator', { ...navigator, sendBeacon: beacon })
  expect(() => track('landing_view')).not.toThrow()
  expect(beacon).toHaveBeenCalledTimes(1)
})

it('reads the visit source from utm_source, then the referring site, else direct', async () => {
  const { trafficSource } = await import('@/lib/analytics')
  window.history.replaceState(null, '', '/?utm_source=Facebook')
  expect(trafficSource()).toBe('facebook')
  window.history.replaceState(null, '', '/')
  vi.spyOn(document, 'referrer', 'get').mockReturnValue('https://www.tiktok.com/@warko')
  expect(trafficSource()).toBe('tiktok.com')
  vi.spyOn(document, 'referrer', 'get').mockReturnValue(`${window.location.origin}/contact`)
  expect(trafficSource()).toBeNull()
  vi.restoreAllMocks()
})
