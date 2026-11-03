import { NextRequest, NextResponse } from 'next/server'
import { invalidRequest } from '@/lib/api-validation'
import { getOrderContext } from '@/lib/order-context'
import { isDeliveryOrder, orderForRole } from '@/lib/order-access'
import { orderErrorResponse } from '@/lib/order-errors'
import { orderSchema } from '@/lib/schemas/order.schema'
import { createOrder, getOrders } from '@/services/order-service'
import { recordEvent } from '@/services/analytics-events-service'

export async function GET() {
  const ctx = await getOrderContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const orders = await getOrders(ctx.profile.organization_id)

    return NextResponse.json(orders.filter(order => ctx.profile.role !== 'manager' || isDeliveryOrder(order)).map(order => orderForRole(order, ctx.profile.role)))
  } catch (err) {
    return orderErrorResponse(err)
  }
}

export async function POST(request: NextRequest) {
  const ctx = await getOrderContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (ctx.profile.role === 'manager') return NextResponse.json({ error: 'Accès réservé aux livraisons' }, { status: 403 })

  const body = await request.json()
  const parsed = orderSchema.safeParse(body)
  if (!parsed.success) {
    return invalidRequest(parsed.error)
  }

  try {
    const order = await createOrder(parsed.data, ctx.user.id, ctx.profile.organization_id)
    await recordEvent('order_created', { userId: ctx.user.id, organizationId: ctx.profile.organization_id }, { channel: parsed.data.channel, role: ctx.profile.role })
    return NextResponse.json(orderForRole(order, ctx.profile.role), { status: 201 })
  } catch (err) {
    return orderErrorResponse(err)
  }
}
