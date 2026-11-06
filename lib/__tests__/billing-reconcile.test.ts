import {it,expect,vi,beforeEach} from 'vitest'
vi.mock('@/services/supabase/server',()=>({createAdminClient:vi.fn()}))
vi.mock('@/lib/billing/moneriz',()=>({readMonerizPayment:vi.fn(),readMonerizSession:vi.fn(),MonerizError:class extends Error{}}))
import {createAdminClient} from '@/services/supabase/server'
import {readMonerizPayment,readMonerizSession} from '@/lib/billing/moneriz'
import {reconcileBillingInvoice} from '@/services/billing-service'
beforeEach(()=>vi.resetAllMocks())
it('releases a closed session with a definitively failed attempt but keeps an open session pending',async()=>{
 for(const status of ['expired','open'] as const){
  const update=vi.fn(),data=[{owner_id:'owner'}, {id:'invoice',mode:'test',reference:'ref',amount:5000,organization_id:'org',checkout_session_id:'cs_one',state:'pending'},null,{state:status==='expired'?'expired':'pending'}]
  const from=vi.fn(()=>{const result={data:data.shift(),error:null};const q={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),update:vi.fn((...args:unknown[])=>{update(...args);return q}),single:vi.fn(async()=>result),then:(resolve:(r:unknown)=>void)=>Promise.resolve(result).then(resolve)};return q})
  vi.mocked(createAdminClient).mockResolvedValue({from,rpc:vi.fn(async()=>({data:'processed',error:null}))} as unknown as Awaited<ReturnType<typeof createAdminClient>>)
  vi.mocked(readMonerizSession).mockResolvedValue({id:'cs_one',mode:'test',status,paymentId:'pay_failed',reference:'ref',amount:5000,currency:'XOF',metadata:{orderId:'invoice',organizationId:'org'}})
  vi.mocked(readMonerizPayment).mockResolvedValue({id:'pay_failed',mode:'test',status:'failed',reference:'ref',amount:5000,currency:'XOF',metadata:{orderId:'invoice',organizationId:'org',checkoutSessionId:'cs_one'}})
  if(status==='open')data.splice(2,1)
  expect(await reconcileBillingInvoice('org','owner','invoice')).toEqual({state:status==='expired'?'expired':'pending'})
  expect(update.mock.calls.length).toBe(status==='expired'?1:0)
 }
})
it('records a failed attempt and returns its visible state without expiring the open reusable link',async()=>{
 const invoice={id:'invoice',mode:'test',reference:'ref',amount:150,organization_id:'org',checkout_session_id:'cs_one',state:'pending'}
 const records=[{owner_id:'owner'},invoice,{state:'pending',last_payment_status:'failed'}]
 const rpc=vi.fn(async()=>({data:'processed',error:null})),update=vi.fn()
 const from=vi.fn(()=>{const result={data:records.shift(),error:null};const q={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),single:async()=>result,update};return q})
 vi.mocked(createAdminClient).mockResolvedValue({from,rpc} as never)
 vi.mocked(readMonerizSession).mockResolvedValue({id:'cs_one',mode:'test',status:'open',paymentId:'pay_failed',reference:'ref',amount:150,currency:'XOF',metadata:{orderId:'invoice',organizationId:'org'}})
 vi.mocked(readMonerizPayment).mockResolvedValue({id:'pay_failed',mode:'test',status:'failed',reference:'ref',amount:150,currency:'XOF',metadata:{orderId:'invoice',organizationId:'org',checkoutSessionId:'cs_one'}})
 expect(await reconcileBillingInvoice('org','owner','invoice')).toEqual({state:'failed'})
 expect(rpc).toHaveBeenCalledWith('apply_moneriz_event',expect.objectContaining({p_mode:'test',p_event:expect.objectContaining({type:'payment.failed'})}));expect(update).not.toHaveBeenCalled()
})
