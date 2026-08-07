import { createClient } from '@/services/supabase/server'

export async function requireOrganizationAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role,organization_id').eq('id', user.id).single()
  if (profile?.role !== 'admin' || !profile.organization_id) return null
  return { user, organizationId: profile.organization_id }
}
