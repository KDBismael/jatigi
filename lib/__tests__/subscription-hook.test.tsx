// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { renderHook, act, waitFor, cleanup } from '@testing-library/react'
import { useSubscription } from '@/hooks/use-subscription'
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
it('surfaces server payment error without automatically creating a second charge', async () => {
  let charges = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      if (String(url).endsWith('/checkout')) {
        charges++
        return Response.json(
          { error: 'Paiement expiré', code: 'EXPIRED' },
          { status: 409 },
        )
      }
      return Response.json({ plan: 'discovery', payments: [] })
    }),
  )
  const { result } = renderHook(() => useSubscription())
  await waitFor(() => expect(result.current.summary).toBeTruthy())
  await act(() => result.current.checkout('pro', 'monthly'))
  expect(result.current.error).toBe('Paiement expiré')
  expect(charges).toBe(1)
})
it('keeps stale data visible on failed refresh', async () => {
  let calls = 0
  vi.stubGlobal('fetch', async () =>
    ++calls === 1
      ? Response.json({ plan: 'discovery', payments: [] })
      : Response.json({ error: 'Indisponible' }, { status: 503 }),
  )
  const { result } = renderHook(() => useSubscription())
  await waitFor(() => expect(result.current.summary).toBeTruthy())
  await act(() => result.current.refresh())
  expect(result.current.summary?.plan).toBe('discovery')
  expect(result.current.error).toBe('Indisponible')
})
