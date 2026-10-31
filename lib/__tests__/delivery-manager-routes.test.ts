import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
vi.mock('@/services/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/services/delivery-driver-service', () => ({ getDeliveryDrivers: vi.fn(), createDeliveryDriver: vi.fn(), addDeliverySettlement: vi.fn() }))
vi.mock('@/services/team-service', () => ({ getTeamMembers: vi.fn(), createTeamMember: vi.fn(), deleteTeamMember: vi.fn(), updateMemberRole: vi.fn() }))
import { createClient } from '@/services/supabase/server'
import { getDeliveryDrivers, addDeliverySettlement, createDeliveryDriver } from '@/services/delivery-driver-service'
import { createTeamMember, updateMemberRole } from '@/services/team-service'
import { GET, POST as createDriver } from '@/app/api/delivery-drivers/route'
import { POST as settle } from '@/app/api/delivery-drivers/[id]/settlements/route'
import { POST as invite, PATCH as changeRole, GET as team } from '@/app/api/team/route'
import { inviteEmployeeSchema } from '@/lib/schemas/team.schema'
function auth(role: string, organization_id: string | null = 'own-org') {
 const q = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { role, organization_id } }) }
 vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'current-user' } } }) }, from: vi.fn().mockReturnValue(q) } as unknown as Awaited<ReturnType<typeof createClient>>)
}
function req(body: object) { return new NextRequest('http://localhost/api/team', { method: 'POST', body: JSON.stringify(body) }) }
const input = { email: 'manager@example.com', full_name: 'Livraisons', password: 'Gestion123', role: 'manager' }
const memberId = '11111111-1111-4111-8111-111111111111'
describe('delivery manager authorization', () => {
 beforeEach(() => vi.resetAllMocks())
 it('validates a delivery manager invitation', () => { expect(inviteEmployeeSchema.safeParse(input).success).toBe(true) })
 it.each(['admin', 'manager'])('returns financial summaries to %s for their own organization', async (role) => {
  auth(role); vi.mocked(getDeliveryDrivers).mockResolvedValue([{ id: 'driver', amount_collected: 9000, amount_due: 7000 }] as Awaited<ReturnType<typeof getDeliveryDrivers>>)
  expect(await (await GET()).json()).toEqual([{ id: 'driver', amount_collected: 9000, amount_due: 7000 }])
  expect(getDeliveryDrivers).toHaveBeenCalledWith('own-org')
 })
 it('redacts employee financial summaries', async () => {
  auth('employee'); vi.mocked(getDeliveryDrivers).mockResolvedValue([{ id: 'driver', amount_collected: 9000, amount_due: 7000 }] as Awaited<ReturnType<typeof getDeliveryDrivers>>)
  expect(await (await GET()).json()).toEqual([expect.objectContaining({ id: 'driver', amount_collected: 0, amount_due: 0 })])
 })
 it.each(['admin', 'manager'])('allows %s settlements using trusted organization and user', async (role) => {
  auth(role)
  expect((await settle(req({ amount: 1000, settled_at: '2026-10-29', organization_id: 'foreign-org' }), { params: Promise.resolve({ id: 'driver' }) })).status).toBe(200)
  expect(addDeliverySettlement).toHaveBeenCalledWith('driver', { amount: 1000, settled_at: '2026-10-29' }, 'own-org', 'current-user')
 })
 it.each([['employee', 'own-org'], ['manager', null]])('rejects settlement with role %s and org %s', async (role, org) => {
  auth(role!, org)
  expect((await settle(req({ amount: 1000, settled_at: '2026-10-29' }), { params: Promise.resolve({ id: 'driver' }) })).status).toBe(403)
  expect(addDeliverySettlement).not.toHaveBeenCalled()
 })
 it('does not allow managers to create drivers or manage the team', async () => {
  auth('manager')
  expect((await createDriver(req({ name: 'Driver' }))).status).toBe(403)
  expect((await team()).status).toBe(403)
  expect((await invite(req(input))).status).toBe(403)
  expect((await changeRole(req({ id: memberId, role: 'admin' }))).status).toBe(403)
  expect(createDeliveryDriver).not.toHaveBeenCalled()
  expect(updateMemberRole).not.toHaveBeenCalled()
 })
 it('allows an admin to invite and assign a manager within their organization', async () => {
  auth('admin'); vi.mocked(createTeamMember).mockResolvedValue({ id: memberId, role: 'manager' } as Awaited<ReturnType<typeof createTeamMember>>)
  expect((await invite(req({ ...input, organization_id: 'foreign-org' }))).status).toBe(201)
  expect(createTeamMember).toHaveBeenCalledWith({ ...input, organization_id: 'own-org' })
  expect((await changeRole(req({ id: memberId, role: 'manager', organization_id: 'foreign-org' }))).status).toBe(200)
  expect(updateMemberRole).toHaveBeenCalledWith(memberId, 'manager', 'own-org')
 })
})
