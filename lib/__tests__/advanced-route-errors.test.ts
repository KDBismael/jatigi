import {beforeEach,expect,it,vi} from 'vitest'
import {NextRequest} from 'next/server'
const mocks=vi.hoisted(()=>({update:vi.fn(),status:'completed'}))
vi.mock('@/lib/admin-context',()=>({requireOrganizationAdmin:async()=>({organizationId:'qa',user:{id:'qa'}})}))
vi.mock('@/services/supabase/server',()=>({createAdminClient:async()=>({from:(table:string)=>{const q={select:()=>q,eq:()=>q,update:(value:unknown)=>{mocks.update(value);return q},single:async()=>table==='live_sessions'?{data:{status:mocks.status},error:null}:{data:null,error:{code:'PGRST116',message:'JSON object requested, multiple (or no) rows returned'}}};return q}})}))
import {PUT as updateLive} from '@/app/api/lives/route'
import {PUT as updateExpense} from '@/app/api/expenses/route'
beforeEach(()=>vi.clearAllMocks())
it.each(['completed','cancelled'])('returns a conflict for a %s live before attempting a transition',async(status)=>{mocks.status=status;const r=await updateLive(new NextRequest('http://localhost/api/lives',{method:'PUT',body:JSON.stringify({id:'10000000-0000-4000-8000-000000000001',session_date:'2026-10-31',slot:'evening',status:'active',target_amount:1000})}));expect(r.status).toBe(409);expect(mocks.update).not.toHaveBeenCalled()})
it('returns not found instead of an internal database error for another shop expense',async()=>{const r=await updateExpense(new NextRequest('http://localhost/api/expenses',{method:'PUT',body:JSON.stringify({id:'10000000-0000-4000-8000-000000000001',category:'internet',label:'QA',amount:1000,expense_date:'2026-10-31'})}));expect(r.status).toBe(404);expect(JSON.stringify(await r.json())).not.toContain('JSON object requested')})
