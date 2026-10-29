import { beforeEach, expect, it, vi } from 'vitest'
vi.mock('@/services/supabase/server',()=>({createClient:vi.fn()}))
import { createClient } from '@/services/supabase/server'
import { getOnboardingProgress } from '@/services/onboarding-service'
beforeEach(()=>vi.resetAllMocks())
it('compte uniquement les objets réels de la boutique authentifiée',async()=>{
 const predicates:unknown[][]=[]
 const from=vi.fn((table:string)=>({select:()=>({eq:(...args:unknown[])=>{predicates.push([table,...args]);const result=table==='organizations'?{data:{onboarding_step:3,onboarding_skipped_steps:[1]},error:null}:{count:table==='products'?1:0,error:null};return table==='organizations'?{single:async()=>result}:Promise.resolve(result)}})}))
 vi.mocked(createClient).mockResolvedValue({from} as unknown as Awaited<ReturnType<typeof createClient>>)
 const state=await getOnboardingProgress('own-org')
 expect(state.completed).toEqual({product:true,driver:false,order:false});expect(state.complete).toBe(false)
 expect(predicates).toEqual([['organizations','id','own-org'],['products','organization_id','own-org'],['delivery_drivers','organization_id','own-org'],['orders','organization_id','own-org']])
})
it('ne présente pas une lecture partielle en cas de panne DB',async()=>{
 const query={error:new Error('database failure'),data:null,count:null}
 const from=vi.fn(()=>({select:()=>({eq:()=>Object.assign(Promise.resolve(query),{single:async()=>query})})}))
 vi.mocked(createClient).mockResolvedValue({from} as unknown as Awaited<ReturnType<typeof createClient>>)
 await expect(getOnboardingProgress('org')).rejects.toThrow('Impossible de charger')
})
