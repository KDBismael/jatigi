import type {SupabaseClient} from '@supabase/supabase-js'
import {BillingAccessError} from '@/lib/billing/access'
import {preparePricedBillingInvoice,type PricedInvoiceInput} from './priced-billing-invoice'
export async function prepareTestBillingInvoice(db:SupabaseClient,input:Omit<PricedInvoiceInput,'mode'>,reconcile?:(id:string)=>Promise<{state:string}>) {
 try{return await preparePricedBillingInvoice(db,{...input,mode:'test'},reconcile)}
 catch(error){if(error instanceof BillingAccessError&&error.code==='BILLING_PRICE_PENDING')throw new BillingAccessError('BILLING_TEST_PRICE_PENDING',error.message,error.status);throw error}
}
