import {beforeEach,it,expect,vi} from 'vitest'
const m=vi.hoisted(()=>({from:vi.fn(),rpc:vi.fn(),session:vi.fn(),payment:vi.fn(),create:vi.fn()}))
vi.mock('@/services/supabase/server',()=>({createAdminClient:async()=>({from:m.from,rpc:m.rpc})}))
vi.mock('@/lib/billing/moneriz',async()=>({...await vi.importActual<typeof import('@/lib/billing/moneriz')>('@/lib/billing/moneriz'),getMonerizMode:()=> 'test',readMonerizSession:m.session,readMonerizPayment:m.payment,createMonerizSession:m.create}))
import {checkoutSubscription} from '@/services/billing-service'
const invoice={id:'old',mode:'test',state:'pending',plan:'business',cycle:'monthly',amount:10000,reference:'ref',created_at:'2026-11-06T00:00:00Z',last_payment_status:'failed',checkout_session_id:'cs_old',checkout_url:'https://moneriz.com/old'}
beforeEach(()=>{vi.clearAllMocks()})
it.each(['expired','open'])('checks a failed attempt before retrying its %s session',async status=>{
 const records=[invoice,{state:status==='expired'?'expired':'pending',last_payment_status:'failed'}]
 m.from.mockImplementation((table:string)=>{let updated=false;const q={select:()=>q,eq:()=>q,update:()=>{updated=true;return q},single:async()=>({data:table==='organizations'?{owner_id:'owner'}:table==='billing_settings'?{mode:'test'}:records.shift(),error:null}),then:(resolve:(value:unknown)=>void)=>Promise.resolve({data:null,error:null,updated}).then(resolve)};return q})
 let prepares=0;m.rpc.mockImplementation(async(name:string)=>({error:null,data:name==='prepare_billing_invoice'?(++prepares===1?invoice:{id:'new',state:'pending',idempotency_key:'new-key',checkout_request:{amount:10000}}):'processed'}))
 m.session.mockResolvedValue({id:'cs_old',mode:'test',status,paymentId:'pay_failed',reference:'ref',amount:10000,currency:'XOF',metadata:{orderId:'old',organizationId:'org'}})
 m.payment.mockResolvedValue({id:'pay_failed',mode:'test',status:'failed',reference:'ref',amount:10000,currency:'XOF',metadata:{orderId:'old',organizationId:'org',checkoutSessionId:'cs_old'}})
 m.create.mockResolvedValue({id:'cs_new',checkoutUrl:'https://moneriz.com/new'})
 const result=await checkoutSubscription('org','owner','business','monthly')
 expect(m.session).toHaveBeenCalledWith('test','cs_old');expect(result.checkoutUrl).toBe(`https://moneriz.com/${status==='expired'?'new':'old'}`);expect(m.create).toHaveBeenCalledTimes(status==='expired'?1:0);expect(prepares).toBe(status==='expired'?2:1)
})
