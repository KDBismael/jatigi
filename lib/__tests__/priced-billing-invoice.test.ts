import {expect,it,vi} from 'vitest'
import {preparePricedBillingInvoice} from '@/services/priced-billing-invoice'
it('creates immutable live invoice metadata using server prices and preserves mode isolation',async()=>{
 const eq=vi.fn(),insert=vi.fn();let row:Record<string,unknown>|null=null
 const q={select:()=>q,eq:(...args:unknown[])=>{eq(...args);return q},order:()=>q,limit:()=>q,maybeSingle:async()=>({data:null,error:null}),insert:(value:Record<string,unknown>)=>{row=value;insert(value);return q},single:async()=>({data:row,error:null})}
 const invoice=await preparePricedBillingInvoice({from:()=>q} as never,{organizationId:'org',userId:'owner',mode:'live',plan:'business',cycle:'yearly',amount:120000,country:'CI',origin:'https://warko.app'})
 expect(invoice.mode).toBe('live');expect(invoice.amount).toBe(120000);expect(invoice.checkout_request.amount).toBe(120000);expect(invoice.reference).toMatch(/^warko-live-/);expect(eq).toHaveBeenCalledWith('mode','live');expect(eq).toHaveBeenCalledWith('organization_id','org');expect(insert).toHaveBeenCalledOnce()
})
it('rejects invalid amounts before any database writes',async()=>{await expect(preparePricedBillingInvoice({} as never,{organizationId:'org',userId:'owner',mode:'live',plan:'pro',cycle:'monthly',amount:50,country:'CI',origin:'https://warko.app'})).rejects.toThrow('INVALID_BILLING_PRICE')})
