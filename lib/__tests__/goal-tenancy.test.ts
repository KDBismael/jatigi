import {beforeEach,expect,it,vi} from 'vitest'
import {NextRequest} from 'next/server'
const mocks=vi.hoisted(()=>({admin:vi.fn(),live:null as null|{id:string},liveError:null as null|{message:string},write:vi.fn(),filters:[] as unknown[][]}))
vi.mock('@/lib/admin-context',()=>({requireOrganizationAdmin:()=>({organizationId:'qa-org',user:{id:'qa-owner'}})}))
vi.mock('@/services/supabase/server',()=>({createAdminClient:mocks.admin}))
import {POST} from '@/app/api/goals/route'
import {goalSchema} from '@/lib/schemas/pilotage.schema'
const liveId='10000000-0000-4000-8000-000000000001'
beforeEach(()=>{vi.clearAllMocks();mocks.live=null;mocks.liveError=null;mocks.filters=[];mocks.admin.mockResolvedValue({from:(table:string)=>{const q={select:()=>q,eq:(...args:unknown[])=>{mocks.filters.push([table,...args]);return q},single:async()=>table==='live_sessions'?{data:mocks.live,error:mocks.liveError}:{data:{id:'goal'},error:null},maybeSingle:async()=>({data:null,error:null}),insert:(data:unknown)=>{mocks.write(data);return q},update:(data:unknown)=>{mocks.write(data);return q}};return q}})})
const request=()=>new NextRequest('http://localhost/api/goals',{method:'POST',body:JSON.stringify({month:'2026-10-01',scope:'live',amount:10000,live_session_id:liveId})})
it('refuses a live outside the authenticated shop before writing a goal',async()=>{const response=await POST(request());expect(response.status).toBe(400);expect(mocks.write).not.toHaveBeenCalled();expect(mocks.filters).toContainEqual(['live_sessions','organization_id','qa-org'])})
it('accepts a live from the current shop',async()=>{mocks.live={id:liveId};expect((await POST(request())).status).toBe(201);expect(mocks.filters).toContainEqual(['live_sessions','organization_id','qa-org'])})
it('rejects missing goal target and impossible calendar month',()=>{expect(goalSchema.safeParse({month:'2026-10-01',scope:'live',amount:100}).success).toBe(false);expect(goalSchema.safeParse({month:'2026-99-01',scope:'global',amount:100}).success).toBe(false)})
