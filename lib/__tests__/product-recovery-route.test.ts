import {beforeEach,expect,it,vi} from 'vitest'
import {NextRequest} from 'next/server'
vi.mock('@/services/supabase/server',()=>({createClient:vi.fn()}))
vi.mock('@/services/product-service',()=>({getProducts:vi.fn(),createProduct:vi.fn()}))
import {createClient} from '@/services/supabase/server'
import {getProducts,createProduct} from '@/services/product-service'
import {ProductCreationAcknowledgedError} from '@/lib/product-errors'
import {GET,POST} from '@/app/api/products/route'
beforeEach(()=>{
 vi.resetAllMocks()
 const q={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),single:vi.fn().mockResolvedValue({data:{role:'admin',organization_id:'own'}})}
 vi.mocked(createClient).mockResolvedValue({auth:{getUser:async()=>({data:{user:{id:'u'}}})},from:()=>q} as never)
})
it('returns a useful unavailable response instead of exposing schema internals',async()=>{
 vi.mocked(getProducts).mockRejectedValue(new Error('relationship missing secret'))
 const log=vi.spyOn(console,'error').mockImplementation(()=>{})
 const res=await GET();expect(res.status).toBe(503)
 expect(await res.json()).toEqual({error:'Impossible de charger les produits. Réessayez.'})
 log.mockRestore()
})
it('acknowledges committed product with 202 rather than retryable 500',async()=>{
 vi.mocked(createProduct).mockRejectedValue(new ProductCreationAcknowledgedError('saved'))
 const res=await POST(new NextRequest('http://localhost/api/products',{method:'POST',body:JSON.stringify({name:'Sac',stock_quantity:10,total_purchase:1000,total_transport:0,total_packaging:0,sale_price:200,pricing_mode:'unit'})}))
 expect(res.status).toBe(202)
 expect(await res.json()).toMatchObject({created:true,id:'saved',code:'PRODUCT_CREATED_READ_UNAVAILABLE'})
})
