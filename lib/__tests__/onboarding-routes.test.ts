import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
vi.mock('@/lib/order-context', () => ({ getOrderContext: vi.fn() }))
vi.mock('@/services/supabase/server', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/services/onboarding-service', () => ({ getOnboardingProgress: vi.fn() }))
import { getOrderContext } from '@/lib/order-context'
import { createAdminClient } from '@/services/supabase/server'
import { getOnboardingProgress } from '@/services/onboarding-service'
import { GET, PATCH } from '@/app/api/onboarding/route'
import { PATCH as saveSettings } from '@/app/api/organization/settings/route'
function auth(role: string) { vi.mocked(getOrderContext).mockResolvedValue({ user: { id: 'user' }, profile: { role, organization_id: 'own-org' } } as Awaited<ReturnType<typeof getOrderContext>>) }
const request = (body: unknown) => new NextRequest('http://localhost/api/onboarding?organization_id=other', {method:'PATCH',body:JSON.stringify(body)})
describe('onboarding et paramètres isolés par boutique', () => {
 beforeEach(() => vi.resetAllMocks())
 it('refuse visiteurs, employés et gestionnaires', async () => {
   expect((await GET()).status).toBe(401)
   for (const role of ['employee','manager']) { auth(role); expect((await GET()).status).toBe(403); expect((await PATCH(request({step:2}))).status).toBe(403); expect((await saveSettings(request({}))).status).toBe(403) }
   expect(createAdminClient).not.toHaveBeenCalled()
 })
 it('lit seulement la boutique de la session sans cache', async () => {
   auth('admin'); vi.mocked(getOnboardingProgress).mockResolvedValue({ complete:false } as Awaited<ReturnType<typeof getOnboardingProgress>>)
   const res=await GET(); expect(res.status).toBe(200); expect(res.headers.get('cache-control')).toBe('private, no-store'); expect(getOnboardingProgress).toHaveBeenCalledWith('own-org')
 })
 it('rejette les tentatives de fausse complétion et de changement de tenant', async () => {
   auth('admin'); expect((await PATCH(request({step:2,complete:true}))).status).toBe(400)
   expect((await saveSettings(request({name:'Other',organization_id:'other'}))).status).toBe(400)
   expect(createAdminClient).not.toHaveBeenCalled()
 })
 it('enregistre une étape sautée sans modifier les objets réels', async () => {
   auth('admin'); const eq=vi.fn().mockResolvedValue({error:null}); const update=vi.fn(()=>({eq})); const from=vi.fn(()=>({update})); vi.mocked(createAdminClient).mockResolvedValue({from} as unknown as Awaited<ReturnType<typeof createAdminClient>>)
   vi.mocked(getOnboardingProgress).mockResolvedValue({complete:false} as Awaited<ReturnType<typeof getOnboardingProgress>>)
   expect((await PATCH(request({step:2,skipped_steps:[1]}))).status).toBe(200)
   expect(from).toHaveBeenCalledWith('organizations'); expect(eq).toHaveBeenCalledWith('id','own-org'); expect(update).toHaveBeenCalledWith(expect.objectContaining({onboarding_step:2,onboarding_skipped_steps:[1]}))
 })
 it('enregistre les paramètres uniquement dans la boutique authentifiée', async () => {
   auth('admin')
   const settings={name:'Boutique Awa',country:'SN',currency:'XOF',default_delivery_fee:1500}
   const single=vi.fn().mockResolvedValue({data:{id:'own-org',...settings},error:null})
   const select=vi.fn(()=>({single}));const eq=vi.fn(()=>({select}));const update=vi.fn(()=>({eq}));const from=vi.fn(()=>({update}))
   vi.mocked(createAdminClient).mockResolvedValue({from} as unknown as Awaited<ReturnType<typeof createAdminClient>>)
   const response=await saveSettings(request(settings))
   expect(response.status).toBe(200);expect(await response.json()).toEqual({id:'own-org',...settings})
   expect(eq).toHaveBeenCalledWith('id','own-org');expect(update).toHaveBeenCalledWith(settings)
 })

})
