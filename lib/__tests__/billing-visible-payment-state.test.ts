import {expect,it} from 'vitest'
import {visiblePaymentState} from '@/lib/billing/payment-state'
it('exposes failed attempts without hiding confirmed payments or closed requests',()=>{
 expect(visiblePaymentState('pending','failed')).toBe('failed');expect(visiblePaymentState('paid','failed')).toBe('paid');expect(visiblePaymentState('expired','failed')).toBe('expired');expect(visiblePaymentState('pending',null)).toBe('pending')
})
