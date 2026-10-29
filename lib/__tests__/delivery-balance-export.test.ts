import {it,expect} from 'vitest'
import {deliveryBalanceCsv} from '@/lib/delivery-balance-export'
it('exports the selected day, monetary distinctions and spreadsheet-safe names',()=>{
 const csv=deliveryBalanceCsv({date:'2026-10-29',undatedOrders:0,drivers:[{driverId:'d',driverName:'=1+1',isActive:true,counts:{delivered:1,in_progress:2,cancelled:0,postponed:1},amountCollected:10500,deliveryFees:500,expectedRemittance:10000,remittedOnDate:8000,globalAmountDue:6000,orders:[]}]})
 expect(csv).toContain("'=1+1");expect(csv).toContain('Reste dû global actuel');expect(csv).toContain('10000');expect(csv).toContain('2026-10-29')
})
