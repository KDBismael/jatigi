import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/services/supabase/server'

export async function GET() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await client.from('profiles').select('organization_id').eq('id', user.id).single()
  if (!profile?.organization_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = await createAdminClient()
  const [sellers, lives] = await Promise.all([
    admin.from('profiles').select('id, full_name').eq('organization_id', profile.organization_id).order('full_name'),
    admin.from('live_sessions').select('id, name, session_date, slot').eq('organization_id', profile.organization_id).neq('status', 'cancelled').order('session_date', { ascending: false }),
  ])
  return NextResponse.json({ sellers: sellers.data ?? [], lives: lives.data ?? [] })
}
