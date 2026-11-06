import {afterEach,expect,it,vi} from 'vitest'
import {readTestBillingPrices} from '@/lib/billing/test-pricing'
afterEach(()=>{vi.unstubAllEnvs();vi.resetModules()})
it('uses normal prices when test variables are absent or empty',()=>{expect(readTestBillingPrices({})).toBeNull();expect(readTestBillingPrices({pro:' ',business:''})).toBeNull()})
it('accepts the requested100/150 integer prices',()=>{expect(readTestBillingPrices({pro:'100',business:'150\n'})).toEqual({pro:100,business:150})})
it.each([{pro:'50',business:'150'},{pro:'100',business:undefined},{pro:'100f',business:'150'},{pro:'100.5',business:'150'}])('refuses partial or invalid price configuration %j',value=>{expect(()=>readTestBillingPrices(value)).toThrow()})
it('applies overrides to both monthly and annual display prices, then restores defaults when removed',async()=>{
 vi.stubEnv('NEXT_PUBLIC_TEST_PRO_PRICE','100');vi.stubEnv('NEXT_PUBLIC_TEST_BUSINESS_PRICE','150');vi.resetModules()
 const test=(await import('@/lib/billing/plans')).PLANS
 expect([test.pro.monthly,test.pro.yearly,test.business.monthly,test.business.yearly]).toEqual([100,100,150,150]);expect(test.pro.launchCompareAt.monthly).toBeNull()
 vi.stubEnv('NEXT_PUBLIC_TEST_PRO_PRICE','');vi.stubEnv('NEXT_PUBLIC_TEST_BUSINESS_PRICE','');vi.resetModules()
 const normal=(await import('@/lib/billing/plans')).PLANS
 expect([normal.pro.monthly,normal.pro.yearly,normal.business.monthly,normal.business.yearly]).toEqual([5000,48000,10000,96000])
})
