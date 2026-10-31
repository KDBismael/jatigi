import { billingErrorResponse } from '@/lib/billing/access'
import { NextRequest,NextResponse } from 'next/server'
import {createAdminClient} from '@/services/supabase/server'
import {requireOrganizationAdmin} from '@/lib/admin-context'
import {liveSchema} from '@/lib/schemas/pilotage.schema'
import {liveTransition} from '@/lib/live-lifecycle'
import {z} from 'zod'
export async function GET(){const a=await requireOrganizationAdmin();if(!a)return NextResponse.json({error:'Forbidden'},{status:403});const db=await createAdminClient();const {data,error}=await db.from('live_sessions').select('*').eq('organization_id',a.organizationId).order('session_date',{ascending:false});if(error)return NextResponse.json({error:'Chargement impossible'},{status:500});return NextResponse.json(data??[])}
export async function POST(r:NextRequest){
 const a=await requireOrganizationAdmin();if(!a)return NextResponse.json({error:'Forbidden'},{status:403})
 const p=liveSchema.safeParse(await r.json());if(!p.success)return NextResponse.json({error:p.error.flatten()},{status:400})
 if(p.data.status!=='planned')return NextResponse.json({error:'Créez une session planifiée avant de la démarrer'},{status:400})
 const db=await createAdminClient();const {data,error}=await db.from('live_sessions').insert({...p.data,organization_id:a.organizationId}).select().single()
 if(error)return billingErrorResponse(new Error(error.message));return NextResponse.json(data,{status:201})
}
export async function PUT(r:NextRequest){
 const a=await requireOrganizationAdmin();if(!a)return NextResponse.json({error:'Forbidden'},{status:403})
 const b=await r.json(),p=liveSchema.safeParse(b),id=z.string().uuid().safeParse(b.id)
 if(!p.success||!id.success)return NextResponse.json({error:'Session invalide'},{status:400})
 const db=await createAdminClient()
 const {data:current,error:readError}=await db.from('live_sessions').select('*').eq('id',id.data).eq('organization_id',a.organizationId).single()
 if(readError||!current)return NextResponse.json({error:'Session introuvable'},{status:404})
 if(['completed','cancelled'].includes(current.status))return NextResponse.json({error:'Session clôturée'},{status:409})
 try {
  const transition=p.data.status===current.status?{}:liveTransition(current.status,p.data.status,new Date().toISOString())
  const {data,error}=await db.from('live_sessions').update({...p.data,...transition}).eq('id',id.data).eq('organization_id',a.organizationId).eq('status',current.status).select().single()
  if(error){if(error.message.includes('PLAN_LIVE_REQUIRED'))return billingErrorResponse(new Error(error.message));return NextResponse.json({error:'Session déjà modifiée, rechargez la page'},{status:409})}
  return NextResponse.json(data)
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Session invalide'},{status:400})}
}
export async function DELETE(r:NextRequest){
 const b=await r.json();const a=await requireOrganizationAdmin();if(!a)return NextResponse.json({error:'Forbidden'},{status:403})
 const id=z.string().uuid().safeParse(b.id);if(!id.success)return NextResponse.json({error:'Session invalide'},{status:400})
 const db=await createAdminClient();const {error}=await db.from('live_sessions').update({status:'cancelled',closed_at:new Date().toISOString()}).eq('id',id.data).eq('organization_id',a.organizationId).in('status',['planned','active'])
 return error?NextResponse.json({error:'Annulation impossible'},{status:500}):NextResponse.json({success:true})
}
