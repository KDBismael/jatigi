import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'
import { orderStatusUpdateSchema, orderUpdateSchema } from '@/lib/schemas/order.schema'
import { updateOrderStatus, updateOrder, getOrderById } from '@/services/order-service'

async function getAuthContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) return null
  return { user, profile }
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const order = await getOrderById(id)
  if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })

  if (ctx.profile.role !== 'admin') {
    const { order_lines, ...rest } = order
    return NextResponse.json({
      ...rest,
      order_lines: order_lines?.map(({
        unit_price: _up, unit_cost: _uc,
        product: { purchase_cost: _pc, import_cost: _ic, packaging_cost: _pkg, ...safeProduct } = {},
        ...line
      }) => ({ ...line, product: safeProduct })),
    })
  }

  return NextResponse.json(order)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const parsed = orderUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const order = await updateOrder(id, parsed.data)
    return NextResponse.json(order)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const parsed = orderStatusUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const order = await updateOrderStatus(id, parsed.data)
    return NextResponse.json(order)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
