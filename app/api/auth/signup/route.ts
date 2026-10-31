import { NextRequest, NextResponse } from 'next/server'
import { invalidRequest } from '@/lib/api-validation'
import { createAdminClient } from '@/services/supabase/server'
import { signupApiSchema } from '@/lib/schemas/auth.schema'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = signupApiSchema.safeParse(body)
  if (!parsed.success) {
    return invalidRequest(parsed.error)
  }

  const { email, password, full_name, phone, organization_name } = parsed.data
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
    phone,
    role: 'admin',
    organization_id: org.id,
  })

  if (profileErr) {
    // Rollback both
    await supabase.auth.admin.deleteUser(userId)
    await supabase.from('organizations').delete().eq('id', org.id)
    return NextResponse.json({ error: profileErr.message }, { status: 500 })
  }

  const { error: salesPersonErr } = await supabase.from('sales_people').insert({
    id: userId,
    organization_id: org.id,
    profile_id: userId,
    full_name,
    phone,
    person_type: 'account',
    base_salary: 0,
    salary_mode: 'manual',
    hired_on: new Date().toISOString().slice(0, 10),
    is_active: true,
  })

  if (salesPersonErr) {
    await supabase.auth.admin.deleteUser(userId)
    await supabase.from('organizations').delete().eq('id', org.id)
    return NextResponse.json({ error: salesPersonErr.message }, { status: 500 })
  }

  // Mark the signup admin as the organization owner.
  const { error: ownerError } = await supabase.from('organizations').update({ owner_id: userId }).eq('id', org.id)
  if (ownerError) {
    await supabase.auth.admin.deleteUser(userId)
    await supabase.from('organizations').delete().eq('id', org.id)
    return NextResponse.json({ error: 'Impossible de finaliser la création de la boutique' }, { status: 500 })
  }

  return NextResponse.json({ success: true, organization: org }, { status: 201 })
}
