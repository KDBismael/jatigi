import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/services/supabase/server'
import { requireOrganizationAdmin } from '@/lib/admin-context'
import { expenseSchema } from '@/lib/schemas/pilotage.schema'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  const auth = await requireOrganizationAdmin(); if (!auth) return NextResponse.json({error:'Forbidden'},{status:403})
  const month = request.nextUrl.searchParams.get('month') ?? new Date().toISOString().slice(0,7)
  const start=`${month}-01`; const [y,m]=month.split('-').map(Number); const end=m===12?`${y+1}-01-01`:`${y}-${String(m+1).padStart(2,'0')}-01`
  const db=await createAdminClient(); await db.rpc('generate_recurring_expenses',{p_month:start})
  const {data,error}=await db.from('expenses').select('*').eq('organization_id',auth.organizationId).gte('expense_date',start).lt('expense_date',end).order('expense_date',{ascending:false})
  if(error)return NextResponse.json({error:error.message},{status:500}); return NextResponse.json(data)
}
export async function POST(request:NextRequest){
  const auth=await requireOrganizationAdmin(); if(!auth)return NextResponse.json({error:'Forbidden'},{status:403})
  const parsed=expenseSchema.safeParse(await request.json()); if(!parsed.success)return NextResponse.json({error:parsed.error.flatten()},{status:400})
  const db=await createAdminClient(); const input=parsed.data
  if(input.recurring){
    const {data:rec,error}=await db.from('expense_recurrences').insert({organization_id:auth.organizationId,category:input.category,label:input.label,amount:input.amount,day_of_month:input.day_of_month??Number(input.expense_date.slice(8,10)),starts_on:input.expense_date}).select().single()
    if(error)return NextResponse.json({error:error.message},{status:500}); await db.rpc('generate_recurring_expenses',{p_month:`${input.expense_date.slice(0,7)}-01`}); return NextResponse.json(rec,{status:201})
  }
  const {data,error}=await db.from('expenses').insert({organization_id:auth.organizationId,category:input.category,label:input.label,amount:input.amount,expense_date:input.expense_date,receipt_url:input.receipt_url||null,created_by:auth.user.id}).select().single()
  if(error)return NextResponse.json({error:error.message},{status:500}); return NextResponse.json(data,{status:201})
}
export async function PUT(request:NextRequest){const auth=await requireOrganizationAdmin();if(!auth)return NextResponse.json({error:'Forbidden'},{status:403});const body=await request.json();const parsed=expenseSchema.safeParse(body);if(!parsed.success)return NextResponse.json({error:parsed.error.flatten()},{status:400});const db=await createAdminClient();const {category,label,amount,expense_date,receipt_url}=parsed.data;const {data,error}=await db.from('expenses').update({category,label,amount,expense_date,receipt_url:receipt_url||null}).eq('id',body.id).eq('organization_id',auth.organizationId).select().single();if(error)return NextResponse.json({error:error.message},{status:500});return NextResponse.json(data)}
export async function DELETE(request:NextRequest){const auth=await requireOrganizationAdmin();if(!auth)return NextResponse.json({error:'Forbidden'},{status:403});const {id}=z.object({id:z.string().uuid()}).parse(await request.json());const db=await createAdminClient();const {error}=await db.from('expenses').delete().eq('id',id).eq('organization_id',auth.organizationId);if(error)return NextResponse.json({error:error.message},{status:500});return NextResponse.json({success:true})}
