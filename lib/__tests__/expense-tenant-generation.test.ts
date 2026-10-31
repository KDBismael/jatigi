import {beforeEach,expect,it,vi} from 'vitest'
import {NextRequest} from 'next/server'
const mocks=vi.hoisted(()=>({rpc:vi.fn(),insert:vi.fn(),admin:vi.fn()}))
vi.mock('@/lib/admin-context',()=>({requireOrganizationAdmin:async()=>({organizationId:'qa-org',user:{id:'qa-user'}})}))
vi.mock('@/services/supabase/server',()=>({createAdminClient:mocks.admin}))
import {GET,POST} from '@/app/api/expenses/route'
beforeEach(()=>{vi.clearAllMocks();mocks.rpc.mockResolvedValue({data:0,error:null});mocks.admin.mockResolvedValue({rpc:mocks.rpc,from:()=>{const q={select:()=>q,eq:()=>q,gte:()=>q,lt:()=>q,order:async()=>({data:[],error:null}),single:async()=>({data:{id:'rec'},error:null}),insert:(data:unknown)=>{mocks.insert(data);return q}};return q}})})
it('uses only tenant-scoped recurring generation before reading expenses',async()=>{const r=await GET(new NextRequest('http://localhost/api/expenses?month=2026-10'));expect(r.status).toBe(200);expect(mocks.rpc).toHaveBeenCalledWith('generate_org_recurring_expenses',{p_organization_id:'qa-org',p_month:'2026-10-01'})})
it('refuses an invalid month before any maintenance call',async()=>{expect((await GET(new NextRequest('http://localhost/api/expenses?month=2026-99'))).status).toBe(400);expect(mocks.rpc).not.toHaveBeenCalled()})
it('does not create recurring configuration if its prerequisite routine is absent',async()=>{mocks.rpc.mockResolvedValue({data:null,error:{code:'PGRST202',message:'missing'}});const r=await POST(new NextRequest('http://localhost/api/expenses',{method:'POST',body:JSON.stringify({category:'rent',label:'QA',amount:1000,expense_date:'2026-10-01',recurring:true,day_of_month:1})}));expect(r.status).toBe(503);expect(mocks.insert).not.toHaveBeenCalled()})
