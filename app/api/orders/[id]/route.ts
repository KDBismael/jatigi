import { NextRequest, NextResponse } from 'next/server'
import { invalidRequest } from '@/lib/api-validation'
import { getOrderContext } from '@/lib/order-context'
import { DELIVERY_STATUSES, isDeliveryOrder, orderForRole } from '@/lib/order-access'
import { orderErrorResponse } from '@/lib/order-errors'
import { orderStatusUpdateSchema, orderUpdateSchema } from '@/lib/schemas/order.schema'
import { updateOrderStatus, updateOrder, getOrderById } from '@/services/order-service'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrderContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const order = await getOrderById(id, ctx.profile.organization_id)
  if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })

  if (ctx.profile.role === 'manager' && !isDeliveryOrder(order)) return NextResponse.json({ error: 'Accès réservé aux livraisons' }, { status: 403 })
  return NextResponse.json(orderForRole(order, ctx.profile.role))
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrderContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (ctx.profile.role === 'manager') return NextResponse.json({ error: 'Accès réservé aux livraisons' }, { status: 403 })

  const { id } = await params
  const body = await request.json()
  const parsed = orderUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return invalidRequest(parsed.error)
  }
  if (ctx.profile.role !== 'admin' && (parsed.data.seller_id !== undefined || parsed.data.live_session_id !== undefined)) {
    return NextResponse.json({ error: 'Seul un administrateur peut modifier le vendeur ou le live' }, { status: 403 })
  }

  try {
    const order = await updateOrder(id, parsed.data, ctx.profile.organization_id)
    return NextResponse.json(orderForRole(order, ctx.profile.role))
  } catch (err) {
    return orderErrorResponse(err)
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrderContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const parsed = orderStatusUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return invalidRequest(parsed.error)
  }

  if (ctx.profile.role === 'manager') {
    const current = await getOrderById(id, ctx.profile.organization_id)
    if (!current || !isDeliveryOrder(current) || !(DELIVERY_STATUSES as readonly string[]).includes(parsed.data.status)) {
      return NextResponse.json({ error: 'Accès réservé aux statuts de livraison' }, { status: 403 })
    }
  }

  try {
    const order = await updateOrderStatus(id, parsed.data, ctx.profile.organization_id)
    return NextResponse.json(orderForRole(order, ctx.profile.role))
  } catch (err) {
    return orderErrorResponse(err)
  }
}
