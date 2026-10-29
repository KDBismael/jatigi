import { createClient } from '@/services/supabase/server'
import { onboardingProgress } from '@/lib/onboarding'

export async function getOnboardingProgress(organizationId: string) {
  const supabase = await createClient()
  const [organization, products, drivers, orders] = await Promise.all([
    supabase.from('organizations').select('onboarding_step,onboarding_skipped_steps,onboarding_started_at').eq('id', organizationId).single(),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('delivery_drivers').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
  ])
  if ([organization, products, drivers, orders].some(result => result.error) || !organization.data) throw new Error('Impossible de charger la progression')
  return onboardingProgress(organization.data, { products: products.count ?? 0, drivers: drivers.count ?? 0, orders: orders.count ?? 0 })
}
