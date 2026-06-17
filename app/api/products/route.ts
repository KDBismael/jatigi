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

    const products = await getProducts()

    if (ctx.profile.role !== 'admin') {
      const safe = products.map(({ purchase_cost: _pc, import_cost: _ic, packaging_cost: _pkg, ...p }) => p)
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
    const product = await createProduct(parsed.data, ctx.profile.organization_id)
    return NextResponse.json(product, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
