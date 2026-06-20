import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'
import { orderStatusUpdateSchema } from '@/lib/schemas/order.schema'
import { updateOrderStatus, getOrderById } from '@/services/order-service'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const order = await getOrderById(id)
  if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  return NextResponse.json(order)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
