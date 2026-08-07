import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'
import {
  getDashboardStats,
  getProductPerformance,
  getChannelStats,
  getRevenueByPeriod,
  getCeoDashboard,
} from '@/services/analytics-service'
import { getPeriodDates, type DateRange } from '@/lib/date-periods'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  return profile?.role === 'admin' && profile.organization_id ? { user, profile } : null
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { searchParams } = request.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const range: DateRange = from && to
    ? { dateFrom: from, dateTo: to }
    : getPeriodDates('today')

  try {
    const abidjanToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Abidjan', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date())
    const [year, month] = abidjanToday.split('-').map(Number)
    const monthStart = `${year}-${String(month).padStart(2,'0')}-01`
    const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2,'0')}-01`
    const [stats, products, channels, revenue, ceo] = await Promise.all([
      getDashboardStats(range, admin.profile.organization_id),
      getProductPerformance(range, admin.profile.organization_id),
      getChannelStats(range, admin.profile.organization_id),
      getRevenueByPeriod(range, admin.profile.organization_id),
      getCeoDashboard(admin.profile.organization_id, abidjanToday, monthStart, nextMonth),
    ])

    return NextResponse.json({ stats, products, channels, revenue, ...ceo })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
