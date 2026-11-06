import {afterEach,beforeEach,expect,it,vi}from'vitest'
const mocks=vi.hoisted(()=>({rpc:vi.fn()}))
vi.mock('@/services/supabase/server',()=>({createAdminClient:async()=>({rpc:mocks.rpc,from:(table:string)=>{const q={select:()=>q,eq:()=>q,single:async()=>({data:table==='organizations'?{owner_id:'qa-owner',country:'CI'}:{mode:'test'},error:null})};return q}})}))
import{checkoutSubscription}from'@/services/billing-service'
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('MONERIZ_MODE','test');vi.stubEnv('VERCEL_ENV','preview');vi.stubEnv('VERCEL_URL','warko-preview.vercel.app');vi.stubEnv('APP_BASE_URL',undefined);mocks.rpc.mockResolvedValue({data:{id:'qa-paid',state:'paid'},error:null})})
afterEach(()=>vi.unstubAllEnvs())
it('uses the actual Vercel preview origin for checkout return links',async()=>{await checkoutSubscription('qa-org','qa-owner','pro','monthly');expect(mocks.rpc).toHaveBeenCalledWith('prepare_billing_invoice',expect.objectContaining({p_origin:'https://warko-preview.vercel.app'}))})
it('retains an explicitly configured origin',async()=>{vi.stubEnv('APP_BASE_URL','https://configured.warko.test');await checkoutSubscription('qa-org','qa-owner','pro','monthly');expect(mocks.rpc).toHaveBeenCalledWith('prepare_billing_invoice',expect.objectContaining({p_origin:'https://configured.warko.test'}))})
