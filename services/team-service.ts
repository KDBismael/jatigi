import { createAdminClient } from '@/services/supabase/server'
import type { Profile } from '@/types/user'

export async function getTeamMembers(organizationId: string): Promise<Profile[]> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as Profile[]
}

export async function createTeamMember(params: {
  email: string
  password: string
  full_name: string
  role: 'admin' | 'employee'
  organization_id: string
}): Promise<Profile> {
  const supabase = await createAdminClient()

  // Create auth user
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
  })

  if (authErr) throw new Error(authErr.message)
  if (!authData.user) throw new Error('Création utilisateur échouée')

  // Create profile scoped to the admin's organization
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,
      full_name: params.full_name,
      role: params.role,
      organization_id: params.organization_id,
    })
    .select()
    .single()

  if (profileErr) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    throw new Error(profileErr.message)
  }

  return profile as Profile
}

export async function updateMemberRole(id: string, role: 'admin' | 'employee', organizationId: string): Promise<void> {
  const supabase = await createAdminClient()
  const { error } = await supabase.from('profiles').update({ role }).eq('id', id).eq('organization_id', organizationId)
  if (error) throw new Error(error.message)
}

export async function deleteTeamMember(id: string, organizationId: string): Promise<void> {
  const supabase = await createAdminClient()
  const { data: member } = await supabase.from('profiles').select('id').eq('id', id).eq('organization_id', organizationId).single()
  if (!member) throw new Error('Membre introuvable dans votre organisation')
  const { error } = await supabase.auth.admin.deleteUser(id)
  if (error) throw new Error(error.message)
}
