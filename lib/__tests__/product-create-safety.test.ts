import {beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({admin:vi.fn(),client:vi.fn()}))
vi.mock('@/services/supabase/server',()=>({createAdminClient:mocks.admin,createClient:mocks.client}))
import {createProduct} from '@/services/product-service'
const input={name:'Sac',stock_quantity:10,purchase_cost:100,import_cost:0,packaging_cost:0,sale_price:200,pricing_mode:'unit'} as Parameters<typeof createProduct>[0]
beforeEach(()=>vi.resetAllMocks())
function setup(preflightError: unknown, readError: unknown=null){
 const queries: {select?:string;eqs:unknown[][];limit?:number}[]=[]
 const admin={from:vi.fn(()=>{
  const q={eqs:[] as unknown[][]} as typeof queries[number];queries.push(q)
  const builder={select:vi.fn((s:string)=>{q.select=s;return builder}),eq:vi.fn((...args:unknown[])=>{q.eqs.push(args);return builder}),limit:vi.fn(async(n:number)=>{q.limit=n;return {data:[],error:preflightError}}),single:vi.fn(async()=>({data:readError?null:{id:'saved',...input},error:readError}))};return builder
 })}
 const rpc=vi.fn(async()=>({data:'saved',error:null}));mocks.admin.mockResolvedValue(admin);mocks.client.mockResolvedValue({rpc})
 return {queries,rpc}
}
it('does not commit a product when its required related schema cannot be read',async()=>{
 const {queries,rpc}=setup({message:'relationship missing'})
 await expect(createProduct(input,'org-a')).rejects.toThrow('catalogue')
 expect(rpc).not.toHaveBeenCalled()
 expect(queries[0].eqs).toContainEqual(['organization_id','org-a'])
 expect(queries[0].limit).toBe(0)
 expect(queries[0].select).toContain('variants:product_variants')
})
it('returns the committed product after a healthy preflight and tenant-scoped read',async()=>{
 const {queries,rpc}=setup(null)
 expect((await createProduct(input,'org-a')).id).toBe('saved')
 expect(rpc).toHaveBeenCalledTimes(1)
 expect(queries[1].eqs).toEqual([['id','saved'],['organization_id','org-a']])
})
it('marks post-commit read failure as acknowledged creation, never a retryable write failure',async()=>{
 setup(null,{message:'temporary read failure'})
 await expect(createProduct(input,'org-a')).rejects.toMatchObject({productId:'saved',name:'ProductCreationAcknowledgedError'})
})
