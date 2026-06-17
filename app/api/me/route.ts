import { createClient } from '@/services/supabase/server'
import { NextResponse } from 'next/server'
import type { Profile, Organization } from '@/types/user'

export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ profile: null, organization: null }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    console.error('[/api/me] profile fetch failed:', profileError?.message)
    return NextResponse.json({ profile: null, organization: null }, { status: 200 })
  }

  const typedProfile = profile as Profile

  if (!typedProfile.organization_id) {
    return NextResponse.json({ profile: typedProfile, organization: null })
  }

  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', typedProfile.organization_id)
    .single()

  if (orgError) {
    console.error('[/api/me] org fetch failed:', orgError.message)
  }

  return NextResponse.json({
    profile: typedProfile,
    organization: (organization as Organization | null) ?? null,
  })
}
