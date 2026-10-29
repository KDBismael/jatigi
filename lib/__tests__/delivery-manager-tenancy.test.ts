import { beforeEach, expect, it, vi } from 'vitest'
vi.mock('@/services/supabase/server', () => ({ createAdminClient: vi.fn() }))
import { createAdminClient } from '@/services/supabase/server'
import { addDeliverySettlement } from '@/services/delivery-driver-service'
import { updateMemberRole } from '@/services/team-service'
beforeEach(() => vi.resetAllMocks())
it('refuses a settlement when the driver is outside the authenticated organization', async () => {
 const eq = vi.fn().mockReturnThis()
 const query = { select: vi.fn().mockReturnThis(), eq, single: vi.fn().mockResolvedValue({ data: null, error: null }) }
 const from = vi.fn().mockReturnValue(query)
 vi.mocked(createAdminClient).mockResolvedValue({ from } as unknown as Awaited<ReturnType<typeof createAdminClient>>)
 await expect(addDeliverySettlement('foreign-driver', { amount: 1000, settled_at: '2026-10-29' }, 'own-org', 'user')).rejects.toThrow('Livreur introuvable')
 expect(eq.mock.calls).toEqual([['id', 'foreign-driver'], ['organization_id', 'own-org']])
 expect(from.mock.calls).toEqual([['delivery_drivers']])
})
it('scopes manager role assignment to the authenticated organization', async () => {
 const query = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), then: (resolve: (value: object) => unknown) => resolve({ error: null }) }
 const from = vi.fn().mockReturnValue(query)
 vi.mocked(createAdminClient).mockResolvedValue({ from } as unknown as Awaited<ReturnType<typeof createAdminClient>>)
 await updateMemberRole('member', 'manager', 'own-org')
 expect(from).toHaveBeenCalledWith('profiles')
 expect(query.update).toHaveBeenCalledWith({ role: 'manager' })
 expect(query.eq.mock.calls).toEqual([['id', 'member'], ['organization_id', 'own-org']])
})
