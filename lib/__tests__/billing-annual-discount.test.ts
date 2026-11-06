import {it,expect} from 'vitest'
import {annualDiscount} from '@/lib/billing/pricing'
it('keeps the standard 20 percent accurate without floating point truncation',()=>{expect(annualDiscount(5000,48000)).toBe(20);expect(annualDiscount(10000,96000)).toBe(20)})
it('does not advertise savings when yearly is more expensive',()=>{expect(annualDiscount(100,1500)).toBe(0);expect(annualDiscount(0,0)).toBe(0)})
