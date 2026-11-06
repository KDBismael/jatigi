import {afterEach,expect,it,vi} from 'vitest'
afterEach(()=>{vi.unstubAllEnvs();vi.resetModules()})
it('uses configured monthly and yearly prices for both offers and hides obsolete crossed prices',async()=>{
 vi.stubEnv('NEXT_PUBLIC_PRO_MONTHLY_PRICE','6000');vi.stubEnv('NEXT_PUBLIC_PRO_YEARLY_PRICE','60000');vi.stubEnv('NEXT_PUBLIC_BUSINESS_MONTHLY_PRICE','12000');vi.stubEnv('NEXT_PUBLIC_BUSINESS_YEARLY_PRICE','120000');vi.resetModules()
 const {PLANS}=await import('@/lib/billing/plans')
 expect([PLANS.pro.monthly,PLANS.pro.yearly,PLANS.business.monthly,PLANS.business.yearly]).toEqual([6000,60000,12000,120000]);expect(PLANS.pro.launchCompareAt.monthly).toBeNull()
})
it('allows changing just one price while retaining the other defaults',async()=>{
 vi.stubEnv('NEXT_PUBLIC_PRO_MONTHLY_PRICE','7500');vi.resetModules();const {PLANS}=await import('@/lib/billing/plans');expect([PLANS.pro.monthly,PLANS.pro.yearly,PLANS.business.monthly]).toEqual([7500,48000,10000])
})
it.each(['0','50','1.5','100f','5000001'])('rejects invalid configured prices %s',async value=>{
 vi.stubEnv('NEXT_PUBLIC_PRO_MONTHLY_PRICE',value);vi.resetModules();await expect(import('@/lib/billing/plans')).rejects.toThrow(/prix|tarif/i)
})
