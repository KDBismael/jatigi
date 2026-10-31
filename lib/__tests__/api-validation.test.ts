import { expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { invalidRequest } from '@/lib/api-validation'

vi.mock('@/services/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u' } } }) },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'admin', organization_id: 'o' } }) }) }) }),
  }),
}))
import { POST as settle } from '@/app/api/delivery-drivers/[id]/settlements/route'

it('answers with one readable French sentence, never a Zod object', async () => {
  const custom = z.object({ amount: z.number().positive('Le montant doit être positif') }).safeParse({ amount: -1 })
  const response = invalidRequest(custom.error!)
  expect(response.status).toBe(400)
  expect(await response.json()).toEqual({ error: 'Le montant doit être positif', field: 'amount' })

  const fallback = z.object({ label: z.string() }).safeParse({ label: 3 })
  const body = await invalidRequest(fallback.error!).json()
  expect(typeof body.error).toBe('string')
  expect(body.error).toMatch(/^Entrée invalide/)
})

it('returns a text error when a settlement payload is invalid', async () => {
  const response = await settle(
    new NextRequest('http://localhost/api/delivery-drivers/d/settlements', { method: 'POST', body: JSON.stringify({ amount: 0, settled_at: '2026-10-31' }) }),
    { params: Promise.resolve({ id: 'd' }) },
  )
  expect(response.status).toBe(400)
  expect((await response.json()).error).toBe('Le montant doit être positif')
})
