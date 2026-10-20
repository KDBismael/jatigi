import { NextRequest, NextResponse } from 'next/server'
import { getOrderContext } from '@/lib/order-context'
import { orderForRole } from '@/lib/order-access'
import { orderErrorResponse } from '@/lib/order-errors'
import { orderSchema } from '@/lib/schemas/order.schema'
import { createOrder, getOrders } from '@/services/order-service'

export async function GET() {
  const ctx = await getOrderContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const orders = await getOrders(ctx.profile.organization_id)

    return NextResponse.json(orders.map(order => orderForRole(order, ctx.profile.role)))
  } catch (err) {
    return orderErrorResponse(err)
  }
}

export async function POST(request: NextRequest) {
  const ctx = await getOrderContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = orderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const order = await createOrder(parsed.data, ctx.user.id, ctx.profile.organization_id)
    return NextResponse.json(orderForRole(order, ctx.profile.role), { status: 201 })
  } catch (err) {
    return orderErrorResponse(err)
  }
}
