import { expect, it } from 'vitest'
import { readBillingIntent, saveBillingIntent } from '@/lib/billing/intent'
it('conserve une intention annuelle pour son utilisateur seulement, sans paiement',()=>{
 const values = new Map<string,string>()
 const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value)},removeItem:(key:string)=>{values.delete(key)}}
 saveBillingIntent(storage,'owner-one','pro','yearly')
 expect(readBillingIntent(storage,'owner-one')).toEqual({plan:'pro',cycle:'yearly',userId:'owner-one'})
 expect(readBillingIntent(storage,'owner-two')).toBeNull()
 storage.setItem('warko.billing-intent','{"userId":"owner-one","plan":"pro","cycle":"invalid"}')
 expect(readBillingIntent(storage,'owner-one')).toBeNull()
})
