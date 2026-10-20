import { createClient } from '@/services/supabase/server'
export async function getOrderContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role,organization_id').eq('id', user.id).single()
  return profile?.organization_id ? { user, profile } : null
}
