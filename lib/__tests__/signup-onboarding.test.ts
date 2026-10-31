import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
vi.mock('@/services/supabase/server',()=>({createAdminClient:vi.fn()}))
import { createAdminClient } from '@/services/supabase/server'
import { POST } from '@/app/api/auth/signup/route'
beforeEach(()=>vi.resetAllMocks())
const request=(body:unknown)=>new NextRequest('http://localhost/api/auth/signup',{method:'POST',body:JSON.stringify(body)})
const valid={email:'awa@example.com',password:'password123',full_name:'Awa',phone:'0700000000',organization_name:'Boutique'}
it('refuse les données invalides avant toute création',async()=>{expect((await POST(request({}))).status).toBe(400);expect(createAdminClient).not.toHaveBeenCalled()})
it('annule le compte si la propriété ne peut être finalisée',async()=>{
 const deleteUser=vi.fn().mockResolvedValue({error:null});const deleteEq=vi.fn().mockResolvedValue({error:null})
 const from=vi.fn((table:string)=>({insert:()=>table==='organizations'?{select:()=>({single:async()=>({data:{id:'own-org'},error:null})})}:Promise.resolve({error:null}),update:()=>({eq:async()=>({error:new Error('owner failed')})}),delete:()=>({eq:deleteEq})}))
 vi.mocked(createAdminClient).mockResolvedValue({from,auth:{admin:{createUser:async()=>({data:{user:{id:'user'}},error:null}),deleteUser}}} as unknown as Awaited<ReturnType<typeof createAdminClient>>)
 const res=await POST(request(valid));expect(res.status).toBe(500);expect(deleteUser).toHaveBeenCalledWith('user');expect(deleteEq).toHaveBeenCalledWith('id','own-org')
})

it.each(['abc123','abcdefgh','12345678'])('refuse le nouveau mot de passe faible %s sans appel Supabase',async(password)=>{expect((await POST(request({...valid,password}))).status).toBe(400);expect(createAdminClient).not.toHaveBeenCalled()})
