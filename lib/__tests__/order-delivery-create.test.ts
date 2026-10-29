import { describe, expect, it, vi } from 'vitest'
vi.mock('@/services/supabase/server',()=>({createClient:vi.fn(),createAdminClient:vi.fn()}))
import { createClient,createAdminClient } from '@/services/supabase/server'
import { createOrder } from '@/services/order-service'
import type { OrderInput } from '@/lib/schemas/order.schema'
describe('création avec journée de tournée',()=>{
  it('transmet la date choisie dans la transaction SQL, indépendamment de la date de commande',async()=>{
    const rpc=vi.fn().mockResolvedValue({data:'order',error:null})
    vi.mocked(createClient).mockResolvedValue({rpc} as unknown as Awaited<ReturnType<typeof createClient>>)
    const query={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),update:vi.fn().mockReturnThis(),single:vi.fn().mockResolvedValue({data:{id:'order'},error:null})}
    vi.mocked(createAdminClient).mockResolvedValue({from:()=>query} as unknown as Awaited<ReturnType<typeof createAdminClient>>)
    await createOrder({client_name:'Awa',channel:'facebook',order_date:'2026-01-01',seller_id:'seller',delivery_driver_id:'driver',delivery_date:'2026-10-29',delivery_fee:0,confirmation_amount:0,lines:[]} as OrderInput,'employee','own-org')
    expect(query.update).not.toHaveBeenCalled()
    expect(rpc).toHaveBeenCalledWith('create_order_complete',{p_data:expect.objectContaining({order_date:'2026-01-01',delivery_date:'2026-10-29',seller_id:'seller'})})
  })
})
