import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/services/supabase/server'
import { z } from 'zod'

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1).max(100),
  organization_name: z.string().min(1).max(120),
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = signupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { email, password, full_name, organization_name } = parsed.data
  const supabase = await createAdminClient()

  // Step 1: Create auth user
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // auto-confirm so they can login immediately
  })

  if (authErr || !authData.user) {
    return NextResponse.json({ error: authErr?.message ?? 'Erreur lors de la création du compte' }, { status: 400 })
  }

  const userId = authData.user.id

  // Step 2: Create organization
  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .insert({ name: organization_name })
    .select()
    .single()

  if (orgErr || !org) {
    // Rollback: delete auth user
    await supabase.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: orgErr?.message ?? 'Erreur lors de la création de la boutique' }, { status: 500 })
  }

  // Step 3: Create profile with admin role
  const { error: profileErr } = await supabase.from('profiles').insert({
    id: userId,
    full_name,
    role: 'admin',
    organization_id: org.id,
  })

  if (profileErr) {
    // Rollback both
    await supabase.auth.admin.deleteUser(userId)
    await supabase.from('organizations').delete().eq('id', org.id)
    return NextResponse.json({ error: profileErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, organization: org }, { status: 201 })
}
