import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'
import { productSchema } from '@/lib/schemas/product.schema'
import { createProduct, getProducts } from '@/services/product-service'

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
  try {
    const ctx = await getAuthContext()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const products = await getProducts(ctx.profile.organization_id)

    if (ctx.profile.role !== 'admin') {
      const safe = products.map((product) => ({
        id: product.id,
        name: product.name,
        sale_price: product.sale_price,
        stock_quantity: product.stock_quantity,
        created_at: product.created_at,
        updated_at: product.updated_at,
      }))
      return NextResponse.json(safe)
    }

    return NextResponse.json(products)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (ctx.profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = productSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const { total_purchase, total_transport, total_packaging, stock_quantity, ...rest } = parsed.data
    const qty = stock_quantity || 1
    const purchase_cost = total_purchase / qty
    const import_cost = total_transport / qty
    const packaging_cost = total_packaging / qty

    const product = await createProduct(
      {
        ...rest,
        stock_quantity,
        purchase_cost,
        import_cost,
        import_cost_type: 'lot',
        import_cost_raw: total_transport,
        import_batch_size: stock_quantity || null,
        packaging_cost,
      },
      ctx.profile.organization_id
    )
    return NextResponse.json(product, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
