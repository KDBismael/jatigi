import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/services/supabase/server'
import { requireOrganizationAdmin } from '@/lib/admin-context'
import { expenseSchema } from '@/lib/schemas/pilotage.schema'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  const auth = await requireOrganizationAdmin(); if (!auth) return NextResponse.json({error:'Forbidden'},{status:403})
  const month = request.nextUrl.searchParams.get('month') ?? new Date().toISOString().slice(0,7)
  if(!z.iso.date().safeParse(`${month}-01`).success)return NextResponse.json({error:'Choisissez un mois valide.'},{status:400})
  const start=`${month}-01`; const [y,m]=month.split('-').map(Number); const end=m===12?`${y+1}-01-01`:`${y}-${String(m+1).padStart(2,'0')}-01`
  const db=await createAdminClient(); const generation=await db.rpc('generate_org_recurring_expenses',{p_organization_id:auth.organizationId,p_month:start}); if(generation.error)return NextResponse.json({error:'Le calcul des dépenses est indisponible. Vérifiez la mise à jour de la base.'},{status:503})
  const {data,error}=await db.from('expenses').select('*, sales_person:sales_people(id, full_name)').eq('organization_id',auth.organizationId).gte('expense_date',start).lt('expense_date',end).order('expense_date',{ascending:false})
  if(error)return NextResponse.json({error:error.message},{status:500}); return NextResponse.json(data)
}
export async function POST(request:NextRequest){
  const auth=await requireOrganizationAdmin(); if(!auth)return NextResponse.json({error:'Forbidden'},{status:403})
  const parsed=expenseSchema.safeParse(await request.json()); if(!parsed.success)return NextResponse.json({error:parsed.error.flatten()},{status:400})
  const db=await createAdminClient(); const input=parsed.data
  if(input.sales_person_id){
    const {data:person}=await db.from('sales_people').select('id').eq('id',input.sales_person_id).eq('organization_id',auth.organizationId).single()
    if(!person)return NextResponse.json({error:'Personne commerciale introuvable'},{status:400})
  }
  if(input.recurring){
    const period=`${input.expense_date.slice(0,7)}-01`;const ready=await db.rpc('generate_org_recurring_expenses',{p_organization_id:auth.organizationId,p_month:period});if(ready.error)return NextResponse.json({error:'Les dépenses récurrentes sont indisponibles. Vérifiez la mise à jour de la base.'},{status:503})
    const {data:rec,error}=await db.from('expense_recurrences').insert({organization_id:auth.organizationId,category:input.category,label:input.label,amount:input.amount,day_of_month:input.day_of_month??Number(input.expense_date.slice(8,10)),starts_on:input.expense_date,sales_person_id:input.sales_person_id||null}).select().single()
    if(error)return NextResponse.json({error:error.message},{status:500}); await db.rpc('generate_org_recurring_expenses',{p_organization_id:auth.organizationId,p_month:period}); return NextResponse.json(rec,{status:201})
  }
  const {data,error}=await db.from('expenses').insert({organization_id:auth.organizationId,category:input.category,label:input.label,amount:input.amount,expense_date:input.expense_date,receipt_url:input.receipt_url||null,sales_person_id:input.sales_person_id||null,created_by:auth.user.id}).select().single()
  if(error)return NextResponse.json({error:error.message},{status:500}); return NextResponse.json(data,{status:201})
}
export async function PUT(request:NextRequest){const auth=await requireOrganizationAdmin();if(!auth)return NextResponse.json({error:'Forbidden'},{status:403});const body=await request.json();const parsed=expenseSchema.safeParse(body);if(!parsed.success)return NextResponse.json({error:parsed.error.flatten()},{status:400});const db=await createAdminClient();const {category,label,amount,expense_date,receipt_url,sales_person_id}=parsed.data;if(sales_person_id){const{data:person}=await db.from('sales_people').select('id').eq('id',sales_person_id).eq('organization_id',auth.organizationId).single();if(!person)return NextResponse.json({error:'Personne commerciale introuvable'},{status:400})}const {data,error}=await db.from('expenses').update({category,label,amount,expense_date,receipt_url:receipt_url||null,sales_person_id:sales_person_id||null}).eq('id',body.id).eq('organization_id',auth.organizationId).select().single();if(error)return NextResponse.json({error:error.code==='PGRST116'?'Dépense introuvable':'Impossible de modifier la dépense.'},{status:error.code==='PGRST116'?404:500});return NextResponse.json(data)}
export async function DELETE(request:NextRequest){const auth=await requireOrganizationAdmin();if(!auth)return NextResponse.json({error:'Forbidden'},{status:403});const {id}=z.object({id:z.string().uuid()}).parse(await request.json());const db=await createAdminClient();const {error}=await db.from('expenses').delete().eq('id',id).eq('organization_id',auth.organizationId);if(error)return NextResponse.json({error:error.message},{status:500});return NextResponse.json({success:true})}
