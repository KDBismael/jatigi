import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'
import {
  getDashboardStats,
  getProductPerformance,
  getChannelStats,
  getRevenueByPeriod,
} from '@/services/analytics-service'
import { getPeriodDates, type DateRange } from '@/lib/date-periods'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'admin' ? user : null
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
    const [stats, products, channels, revenue] = await Promise.all([
      getDashboardStats(range),
      getProductPerformance(range),
      getChannelStats(range),
      getRevenueByPeriod(range),
    ])

    return NextResponse.json({ stats, products, channels, revenue })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
