import {beforeEach,afterEach,it,expect,vi} from 'vitest'
const mocks=vi.hoisted(()=>({owner:'owner',prepare:vi.fn(),create:vi.fn(),rpc:vi.fn()}))
vi.mock('@/lib/billing/test-pricing',()=>({TEST_BILLING_PRICES:null}))
vi.mock('@/lib/billing/pricing',()=>({HAS_CUSTOM_BILLING_PRICES:true,CONFIGURED_BILLING_PRICES:{pro:{monthly:6000,yearly:60000},business:{monthly:12000,yearly:120000}},annualDiscount:()=>16}))
vi.mock('@/services/priced-billing-invoice',()=>({preparePricedBillingInvoice:mocks.prepare}))
vi.mock('@/services/supabase/server',()=>({createAdminClient:async()=>({rpc:mocks.rpc,from:(table:string)=>{const q={select:()=>q,eq:()=>q,single:async()=>({data:table==='organizations'?{owner_id:mocks.owner,country:'CI'}:{mode:'live'},error:null})};return q}})}))
vi.mock('@/lib/billing/moneriz',async()=>({...await vi.importActual<typeof import('@/lib/billing/moneriz')>('@/lib/billing/moneriz'),getMonerizMode:()=> 'live',createMonerizSession:mocks.create}))
import {checkoutSubscription} from '@/services/billing-service'
beforeEach(()=>{vi.clearAllMocks();mocks.owner='owner';vi.stubEnv('APP_BASE_URL','https://warko.app');mocks.rpc.mockResolvedValue({data:null,error:null});mocks.create.mockResolvedValue({id:'cs_live',checkoutUrl:'https://moneriz.com/live'});mocks.prepare.mockResolvedValue({id:'invoice',state:'pending',mode:'live',idempotency_key:'key',checkout_request:{amount:120000}})})
afterEach(()=>vi.unstubAllEnvs())
it('charges the configured annual price in live mode through the verified owner checkout',async()=>{await checkoutSubscription('org','owner','business','yearly');expect(mocks.prepare).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({mode:'live',amount:120000,plan:'business',cycle:'yearly',organizationId:'org'}),expect.any(Function));expect(mocks.create).toHaveBeenCalledWith('live','key',{amount:120000});expect(mocks.rpc).toHaveBeenCalledWith('save_billing_checkout',expect.anything())})
it('refuses another shop owner before preparing any live invoice',async()=>{mocks.owner='someone-else';await expect(checkoutSubscription('org','owner','pro','monthly')).rejects.toMatchObject({code:'BILLING_OWNER_REQUIRED'});expect(mocks.prepare).not.toHaveBeenCalled();expect(mocks.create).not.toHaveBeenCalled()})
