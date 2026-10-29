import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/services/delivery-driver-service',()=>({getDeliveryDrivers:vi.fn().mockResolvedValue([])}))
vi.mock('@/services/supabase/server', () => ({ createAdminClient: vi.fn() }))
import { createAdminClient } from '@/services/supabase/server'
import {getDeliveryDrivers} from '@/services/delivery-driver-service'
import { getDeliveryDayReport } from '@/services/delivery-balance-service'
function mock(pages: { data: unknown; error: unknown }[]) {
  const next = vi.fn()
  pages.forEach(page => next.mockResolvedValueOnce(page))
  const assignments = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), range: vi.fn().mockReturnThis(), then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) => next().then(resolve,reject) }
  const undated = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), not: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), then: (resolve: (value: unknown) => unknown) => Promise.resolve({count: 3,error: null}).then(resolve) }
  const from = vi.fn((table: string) => table === 'orders' ? undated : table === 'delivery_settlements' ? {select:()=>({eq:()=>({eq:()=>({order:()=>({range:async()=>({data:[],error:null})})})})})} : assignments)
  vi.mocked(createAdminClient).mockResolvedValue({from} as unknown as Awaited<ReturnType<typeof createAdminClient>>)
  return {assignments,undated}
}
describe('lecture du bilan quotidien',()=>{
  beforeEach(()=>{vi.resetAllMocks();vi.mocked(getDeliveryDrivers).mockResolvedValue([])})
  it('filtre journée de tournée et boutique à chaque page et conserve plus de 1000 colis sans coûts',async()=>{
    const row={id:'a',order_id:'order',driver_id:'driver',status:'delivered',remittable_amount:1000,driver:{name:'Ali',is_active:true},order:null}
    const {assignments,undated}=mock([{data:Array(500).fill(row),error:null},{data:Array(500).fill(row),error:null},{data:[row],error:null}])
    const report=await getDeliveryDayReport('own-org','2026-10-29')
    expect(assignments.range.mock.calls).toEqual([[0,499],[500,999],[1000,1499]])
    expect(assignments.eq.mock.calls).toEqual(Array(3).fill([['organization_id','own-org'],['assignment_date','2026-10-29']]).flat())
    expect(assignments.select.mock.calls[0][0]).not.toMatch(/\*|cost|purchase|packaging/)
    expect(undated.eq).toHaveBeenCalledWith('organization_id','own-org')
    expect(report.drivers[0]).toMatchObject({expectedRemittance:1001000,counts:{delivered:1001}})
    expect(report.undatedOrders).toBe(3)
  })
  it('ne retourne pas de bilan partiel après un échec de lecture',async()=>{
    mock([{data:null,error:{message:'failure'}}])
    await expect(getDeliveryDayReport('own-org','2026-10-29')).rejects.toThrow('Impossible de charger le bilan')
  })
})
