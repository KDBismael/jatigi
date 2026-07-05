import { createClient, createAdminClient } from '@/services/supabase/server'
import type { User } from '@supabase/supabase-js'

/**
 * Gate for the platform (super) admin area. Returns the auth user when the caller
 * is registered in `platform_admins`, otherwise null. The membership lookup uses
 * the service-role client so it is independent of RLS.
 */
export async function requirePlatformAdmin(): Promise<{ user: User } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = await createAdminClient()
  const { data } = await admin
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  return data ? { user } : null
}
