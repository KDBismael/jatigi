import { NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'
import {
  getDashboardStats,
  getProductPerformance,
  getChannelStats,
  getRevenueByPeriod,
} from '@/services/analytics-service'

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

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const [stats, products, channels, revenue] = await Promise.all([
      getDashboardStats(),
      getProductPerformance(),
      getChannelStats(),
      getRevenueByPeriod(30),
    ])

    return NextResponse.json({ stats, products, channels, revenue })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
