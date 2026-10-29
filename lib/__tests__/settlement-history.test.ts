import { expect,it,vi } from 'vitest'
vi.mock('@/services/supabase/server',()=>({createAdminClient:vi.fn()}))
import { createAdminClient } from '@/services/supabase/server'
import { getDeliverySettlementHistory } from '@/services/delivery-driver-service'
it('reads dated settlement history with recorder, scoped to driver and organization',async()=>{
 const result=[{id:'s',amount:500,settled_at:'2026-10-29',created_by:'u',recorder:{full_name:'Awa'}}]
 const q={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),order:vi.fn().mockReturnThis(),range:vi.fn().mockResolvedValue({data:result,error:null})}
 vi.mocked(createAdminClient).mockResolvedValue({from:()=>q} as never)
 expect(await getDeliverySettlementHistory('d','o')).toEqual(result)
 expect(q.eq.mock.calls).toEqual([['organization_id','o'],['delivery_driver_id','d']])
})
