import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'
import { getProductById, updateProduct, deleteProduct } from '@/services/product-service'
import { z } from 'zod'

const COST_FIELDS = [
  'purchase_cost', 'import_cost', 'import_cost_raw',
  'import_cost_type', 'import_batch_size', 'packaging_cost',
] as const

// Costs must go through /lots — only descriptive/price/qty fields are editable
const productUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  sale_price: z.coerce.number().positive().optional(),
})

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  const { id } = await params
  if (!profile?.organization_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const product = await getProductById(id, profile.organization_id)
  if (!product) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })

  if (profile?.role !== 'admin') {
    return NextResponse.json({ id: product.id, name: product.name, stock_quantity: product.stock_quantity })
  }
  return NextResponse.json(product)
}

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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id } = await params
  const body = await request.json()

  // Reject any attempt to modify cost fields directly
  const forbiddenFields = COST_FIELDS.filter((f) => f in body)
  if (forbiddenFields.length > 0) {
    return NextResponse.json(
      { error: `Les coûts ne peuvent pas être modifiés directement. Utilisez l'ajout de stock. Champs refusés : ${forbiddenFields.join(', ')}` },
      { status: 400 },
    )
  }

  const parsed = productUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const product = await updateProduct(id, parsed.data, admin.profile.organization_id)
    return NextResponse.json(product)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id } = await params
  try {
    await deleteProduct(id, admin.profile.organization_id)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
