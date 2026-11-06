import {expect,it,vi}from'vitest'
import{prepareTestBillingInvoice}from'@/services/test-billing-invoice'
const input={organizationId:'qa-org',userId:'qa-owner',plan:'pro' as const,cycle:'monthly' as const,amount:100,country:'CI',origin:'https://warko.test'}
function repository(existing:Record<string,unknown>|null=null){let pending=existing;const filters:unknown[][]=[];const writes=vi.fn();const db={from:()=>{let row:Record<string,unknown>|null=null;const q={select:()=>q,eq:(...args:unknown[])=>{filters.push(args);return q},order:()=>q,limit:()=>q,maybeSingle:async()=>({data:pending,error:null}),insert:(value:Record<string,unknown>)=>{row=value;return q},single:async()=>{if(pending)return{data:null,error:{code:'23505',message:'unique pending'}};pending=row;writes(row);return{data:row,error:null}}};return q}};return{db,writes,filters,clearPending(){pending=null},get pending(){return pending}}}
it('creates a fresh immutable server-priced test invoice and keeps concurrent attempts idempotent',async()=>{const repo=repository();const [a,b]=await Promise.all([prepareTestBillingInvoice(repo.db as never,input),prepareTestBillingInvoice(repo.db as never,input)]);expect(a.id).toBe(b.id);expect(a.amount).toBe(100);expect(a.checkout_request.amount).toBe(100);expect(a.mode).toBe('test');expect(repo.writes).toHaveBeenCalledOnce();expect(repo.filters).toContainEqual(['organization_id','qa-org'])})
it('does not reprice an already existing provider request',async()=>{const existing={id:'old',plan:'pro',cycle:'monthly',amount:5000,state:'pending',retry_after:null};const repo=repository(existing);await expect(prepareTestBillingInvoice(repo.db as never,input)).rejects.toMatchObject({code:'BILLING_TEST_PRICE_PENDING',status:409});expect(repo.pending).toBe(existing);expect(repo.writes).not.toHaveBeenCalled()})
it('resumes an existing request with the same plan cycle and amount',async()=>{const existing={id:'current',plan:'pro',cycle:'monthly',amount:100,state:'pending',retry_after:null};const repo=repository(existing);expect((await prepareTestBillingInvoice(repo.db as never,input)).id).toBe('current');expect(repo.writes).not.toHaveBeenCalled()})
it('does not replace a pending different offer',async()=>{const repo=repository({id:'old',plan:'business',cycle:'monthly',amount:150});await expect(prepareTestBillingInvoice(repo.db as never,input)).rejects.toMatchObject({code:'BILLING_PAYMENT_PENDING'});expect(repo.writes).not.toHaveBeenCalled()})

it('rechecks the old session and creates a new invoice only after confirmed expiration',async()=>{
 const repo=repository({id:'old',plan:'pro',cycle:'monthly',amount:5000,state:'pending',checkout_session_id:'cs_old'})
 const reconcile=vi.fn(async()=>{repo.clearPending();return {state:'expired'}})
 const invoice=await prepareTestBillingInvoice(repo.db as never,input,reconcile)
 expect(reconcile).toHaveBeenCalledWith('old');expect(invoice.amount).toBe(100);expect(invoice.id).not.toBe('old');expect(repo.writes).toHaveBeenCalledOnce()
})
it('keeps an active old session blocked even after checking the provider',async()=>{
 const repo=repository({id:'old',plan:'pro',cycle:'monthly',amount:5000,state:'pending',checkout_session_id:'cs_old'})
 const reconcile=vi.fn(async()=>({state:'pending'}))
 await expect(prepareTestBillingInvoice(repo.db as never,input,reconcile)).rejects.toMatchObject({code:'BILLING_TEST_PRICE_PENDING'})
 expect(reconcile).toHaveBeenCalledWith('old');expect(repo.writes).not.toHaveBeenCalled()
})
it('returns a newly confirmed old payment instead of charging again',async()=>{
 const repo=repository({id:'old',plan:'pro',cycle:'monthly',amount:5000,state:'pending',checkout_session_id:'cs_old'})
 const invoice=await prepareTestBillingInvoice(repo.db as never,input,async()=>({state:'paid'}))
 expect(invoice.state).toBe('paid');expect(invoice.id).toBe('old');expect(repo.writes).not.toHaveBeenCalled()
})
it('does not create another request if the provider cannot be checked',async()=>{
 const repo=repository({id:'old',plan:'pro',cycle:'monthly',amount:5000,state:'pending',checkout_session_id:'cs_old'})
 await expect(prepareTestBillingInvoice(repo.db as never,input,async()=>{throw new Error('provider unavailable')})).rejects.toThrow('provider unavailable')
 expect(repo.writes).not.toHaveBeenCalled()
})
