import { createAdminClient } from '@/services/supabase/server'
import {
  summarizeUsers,
  summarizeOrders,
  summarizeDeliveries,
  revenueProfitFromDelivered,
} from '@/lib/platform-metrics'
import { isExcludedEmail } from '@/lib/platform-config'
import type { RevenueByPeriod } from '@/types/analytics'
import type { PlatformOverview, PlatformUser, PlatformOrganization } from '@/types/platform'
import type { Role } from '@/lib/constants'

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>

// order_lines select shared across the cross-org queries.
const ORDER_SELECT =
  'organization_id, status, order_date, confirmation_amount, delivery_fee, order_lines(line_total, total_cost, unit_price, unit_cost, quantity, product:products(purchase_cost, import_cost, packaging_cost))'

type OrgRow = { id: string; name: string; owner_id: string | null; created_at?: string }

type OrderRow = {
  organization_id: string
  status: string
  order_date: string
  confirmation_amount: number | null
  delivery_fee: number | null
  order_lines?: {
    line_total?: number
    total_cost?: number
    unit_price?: number | null
    unit_cost: number
    quantity: number
    product?: { purchase_cost?: number; import_cost?: number; packaging_cost?: number } | null
  }[]
}

/** Emails live in auth.users — reachable only via the service-role admin API. */
async function fetchEmailsById(supabase: AdminClient): Promise<Map<string, string>> {
  const emailById = new Map<string, string>()
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error || !data?.users?.length) break
    for (const u of data.users) if (u.email) emailById.set(u.id, u.email)
    if (data.users.length < 1000) break
  }
  return emailById
}

/**
 * Resolve which organizations are hidden from every platform view. Exclusion is
 * keyed on email (unique): any org that has a member whose email is in
 * EXCLUDED_EMAILS is excluded in full. Returns the org-id set plus the shared
 * email map so callers can reuse it.
 */
async function resolveExclusions(
  supabase: AdminClient,
): Promise<{ excludedOrgIds: Set<string>; emailById: Map<string, string> }> {
  const emailById = await fetchEmailsById(supabase)
  const { data: profiles } = await supabase.from('profiles').select('id, organization_id')
  const excludedOrgIds = new Set<string>()
  for (const p of profiles ?? []) {
    if (p.organization_id && isExcludedEmail(emailById.get(p.id))) excludedOrgIds.add(p.organization_id)
  }
  return { excludedOrgIds, emailById }
}

function buildRevenueSeries(orders: OrderRow[]): RevenueByPeriod[] {
  const map = new Map<string, RevenueByPeriod>()
  for (const order of orders) {
    if (order.status !== 'delivered') continue
    const lines = order.order_lines ?? []
    const revenue = lines.reduce((s, l) => s + (l.line_total == null ? Number(l.unit_price ?? 0) * l.quantity : Number(l.line_total)), 0)
    const { profit } = revenueProfitFromDelivered([order])
    const existing = map.get(order.order_date)
    if (existing) {
      existing.revenue += revenue
      existing.profit += profit
    } else {
      map.set(order.order_date, { date: order.order_date, revenue, profit })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}

export async function getPlatformOverview(): Promise<PlatformOverview> {
  const supabase = await createAdminClient()

  const [{ excludedOrgIds: excluded }, { data: orgs }, { data: profiles }, { data: orders }, { data: settlements }, { data: drivers }] =
    await Promise.all([
      resolveExclusions(supabase),
      supabase.from('organizations').select('id, name, owner_id'),
      supabase.from('profiles').select('id, role, organization_id'),
      supabase.from('orders').select(ORDER_SELECT),
      supabase.from('delivery_settlements').select('organization_id, amount'),
      supabase.from('delivery_drivers').select('organization_id, is_active'),
    ])

  const orgRows = (orgs ?? []) as OrgRow[]

  const keptOrgs = orgRows.filter((o) => !excluded.has(o.id))
  const keptProfiles = (profiles ?? []).filter((p) => !p.organization_id || !excluded.has(p.organization_id))
  const orderRows = ((orders ?? []) as unknown as OrderRow[]).filter((o) => !excluded.has(o.organization_id))
  const keptSettlements = ((settlements ?? []) as { organization_id: string; amount: number }[]).filter(
    (s) => !excluded.has(s.organization_id),
  )
  const activeDrivers = ((drivers ?? []) as { organization_id: string; is_active: boolean }[]).filter(
    (d) => d.is_active && !excluded.has(d.organization_id),
  ).length

  const ownerIds = keptOrgs.map((o) => o.owner_id).filter((v): v is string => Boolean(v))
  const users = summarizeUsers(keptProfiles, ownerIds)
  const orderStats = summarizeOrders(orderRows)
  const { revenue, profit } = revenueProfitFromDelivered(orderRows)
  const delivery = summarizeDeliveries(
    orderRows.map((o) => ({ status: o.status, confirmation_amount: o.confirmation_amount ?? 0, delivery_fee: o.delivery_fee ?? 0, order_lines: o.order_lines })),
    keptSettlements,
  )

  return {
    organizations_count: keptOrgs.length,
    users_count: users.users_count,
    admins: users.admins,
    employees: users.employees,
    owners: users.owners,
    orders_total: orderStats.total,
    orders_by_status: orderStats.by_status,
    total_revenue: revenue,
    net_profit: profit,
    delivery_collected: delivery.collected,
    delivery_remitted: delivery.remitted,
    delivery_due: delivery.due,
    active_drivers: activeDrivers,
    revenue_series: buildRevenueSeries(orderRows),
  }
}

/** Every user across every (non-excluded) organization, with email + owner flag. */
export async function getAllUsers(): Promise<PlatformUser[]> {
  const supabase = await createAdminClient()

  // NOTE: don't embed organizations here — since migration 008 added
  // organizations.owner_id → profiles there are two FK paths between the tables,
  // which makes a PostgREST embed ambiguous. Fetch orgs separately and map in JS.
  const [{ excludedOrgIds: excluded, emailById }, { data: profiles }, { data: orgs }] = await Promise.all([
    resolveExclusions(supabase),
    supabase.from('profiles').select('id, full_name, phone, role, organization_id, created_at').order('created_at', { ascending: false }),
    supabase.from('organizations').select('id, name, owner_id'),
  ])

  const orgRows = (orgs ?? []) as OrgRow[]
  const orgById = new Map(orgRows.map((o) => [o.id, o]))

  return (profiles ?? [])
    .filter((p) => !p.organization_id || !excluded.has(p.organization_id))
    .map((p) => {
      const org = p.organization_id ? orgById.get(p.organization_id) : null
      return {
        id: p.id,
        full_name: p.full_name,
        email: emailById.get(p.id) ?? null,
        phone: p.phone ?? null,
        role: p.role as Role,
        organization_id: p.organization_id,
        organization_name: org?.name ?? null,
        is_owner: Boolean(org?.owner_id && org.owner_id === p.id),
        created_at: p.created_at,
      }
    })
}

/** Per-organization rollup for the platform organizations table (excludes test orgs). */
export async function getOrganizationsOverview(): Promise<PlatformOrganization[]> {
  const supabase = await createAdminClient()

  const [{ excludedOrgIds: excluded }, { data: orgs }, { data: profiles }, { data: orders }] = await Promise.all([
    resolveExclusions(supabase),
    supabase.from('organizations').select('id, name, created_at, owner_id').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name, organization_id'),
    supabase.from('orders').select(ORDER_SELECT),
  ])

  const orderRows = (orders ?? []) as unknown as OrderRow[]

  return (orgs ?? [])
    .filter((org) => !excluded.has(org.id))
    .map((org) => {
      const orgProfiles = (profiles ?? []).filter((p) => p.organization_id === org.id)
      const ownerName = orgProfiles.find((p) => p.id === org.owner_id)?.full_name ?? null
      const orgOrders = orderRows.filter((o) => o.organization_id === org.id)
      const { revenue } = revenueProfitFromDelivered(orgOrders)
      const { collected } = summarizeDeliveries(
        orgOrders.map((o) => ({ status: o.status, confirmation_amount: o.confirmation_amount ?? 0, delivery_fee: o.delivery_fee ?? 0, order_lines: o.order_lines })),
        [],
      )
      return {
        id: org.id,
        name: org.name,
        owner_name: ownerName,
        users_count: orgProfiles.length,
        orders_count: orgOrders.length,
        revenue,
        delivery_collected: collected,
        created_at: org.created_at,
      }
    })
}
