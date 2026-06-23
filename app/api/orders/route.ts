import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'
import { orderSchema } from '@/lib/schemas/order.schema'
import { createOrder, getOrders } from '@/services/order-service'

async function getAuthContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) return null
  return { user, profile }
}

export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const orders = await getOrders(ctx.profile.organization_id)

    if (ctx.profile.role !== 'admin') {
      const safe = orders.map(({ order_lines, ...order }) => ({
        ...order,
        order_lines: order_lines?.map((line) => ({
          id: line.id,
          order_id: line.order_id,
          product_id: line.product_id,
          quantity: line.quantity,
          product: line.product,
        })),
      }))
      return NextResponse.json(safe)
    }

    return NextResponse.json(orders)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = orderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const order = await createOrder(parsed.data, ctx.user.id, ctx.profile.organization_id)
    return NextResponse.json(order, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
