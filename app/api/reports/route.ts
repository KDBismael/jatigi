import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/services/supabase/server'
import { requireOrganizationAdmin } from '@/lib/admin-context'
import { abidjanToday, getReportRange, isClosedRange, REPORT_PERIODS } from '@/lib/report-periods'

const periodSchema = z.enum(REPORT_PERIODS)

export async function GET(request: NextRequest) {
  const auth = await requireOrganizationAdmin()
  if (!auth) return NextResponse.json({ error:'Forbidden' }, { status:403 })
  const parsed = periodSchema.safeParse(request.nextUrl.searchParams.get('type') ?? 'monthly')
  if (!parsed.success) return NextResponse.json({ error:'Périodicité invalide' }, { status:400 })
  const db = await createAdminClient()
  if (request.nextUrl.searchParams.get('history') === '1') {
    const { data, error } = await db.from('periodic_reports').select('*').eq('organization_id',auth.organizationId).eq('period_type',parsed.data).order('period_start',{ascending:false}).limit(100)
    if (error) return NextResponse.json({ error:error.message }, { status:500 })
    return NextResponse.json(data ?? [])
  }
  const anchor = request.nextUrl.searchParams.get('anchor') ?? abidjanToday()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(anchor)) return NextResponse.json({ error:'Date invalide' }, { status:400 })
  const range = getReportRange(parsed.data, anchor)
  const existing = await db.from('periodic_reports').select('*').eq('organization_id',auth.organizationId).eq('period_type',parsed.data).eq('period_start',range.start).eq('period_end',range.end).maybeSingle()
  if (existing.error) return NextResponse.json({ error:existing.error.message }, { status:500 })
  if (existing.data) return NextResponse.json({ ...existing.data, is_closed:true, label:range.label })
  const { data:snapshot, error } = await db.rpc('build_period_snapshot',{p_org:auth.organizationId,p_start:range.start,p_end:range.end})
  if (error) return NextResponse.json({ error:error.message }, { status:500 })
  return NextResponse.json({ period_type:parsed.data,period_start:range.start,period_end:range.end,snapshot,is_closed:false,is_current:!isClosedRange(range),label:range.label })
}

export async function POST(request: NextRequest) {
  const auth = await requireOrganizationAdmin()
  if (!auth) return NextResponse.json({ error:'Forbidden' }, { status:403 })
  const body = await request.json()
  const parsed = z.object({ type:periodSchema, anchor:z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error:'Données invalides' }, { status:400 })
  const range = getReportRange(parsed.data.type,parsed.data.anchor)
  if (!isClosedRange(range)) return NextResponse.json({ error:'Une période en cours ne peut pas être clôturée' }, { status:400 })
  const db = await createAdminClient()
  const { data:snapshot,error } = await db.rpc('build_period_snapshot',{p_org:auth.organizationId,p_start:range.start,p_end:range.end})
  if (error) return NextResponse.json({ error:error.message }, { status:500 })
  const existing = await db.from('periodic_reports').select('id').eq('organization_id',auth.organizationId).eq('period_type',parsed.data.type).eq('period_start',range.start).eq('period_end',range.end).maybeSingle()
  const result = existing.data
    ? await db.from('periodic_reports').update({snapshot,regenerated_at:new Date().toISOString(),regenerated_by:auth.user.id}).eq('id',existing.data.id).select().single()
    : await db.from('periodic_reports').insert({organization_id:auth.organizationId,period_type:parsed.data.type,period_start:range.start,period_end:range.end,snapshot,regenerated_at:new Date().toISOString(),regenerated_by:auth.user.id}).select().single()
  if (result.error) return NextResponse.json({ error:result.error.message }, { status:500 })
  return NextResponse.json({ ...result.data,is_closed:true,label:range.label })
}
