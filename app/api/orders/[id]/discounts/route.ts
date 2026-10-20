import { NextRequest, NextResponse } from 'next/server'
import { getOrderContext } from '@/lib/order-context'
import { discountUpdateSchema } from '@/lib/discounts'
import { orderForRole } from '@/lib/order-access'
import { orderErrorResponse } from '@/lib/order-errors'
import { getOrderById } from '@/services/order-service'
import { createClient } from '@/services/supabase/server'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrderContext()
  if (!ctx) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
  const parsed = discountUpdateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Remise invalide : montant, motif et lignes requis.' }, { status: 400 })
  const { id } = await params
  try {
    const client = await createClient()
    const { error } = await client.rpc('update_order_discounts_safe', { p_order_id: id, p_lines: parsed.data.lines })
    if (error) throw new Error(error.message)
    const order = await getOrderById(id, ctx.profile.organization_id)
    if (!order) throw new Error('ORDER_NOT_FOUND')
    return NextResponse.json(orderForRole(order, ctx.profile.role), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return orderErrorResponse(error) }
}
