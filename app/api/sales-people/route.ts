import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOrganizationAdmin } from '@/lib/admin-context'
import { salesPersonSchema, salesPersonUpdateSchema } from '@/lib/schemas/sales-person.schema'
import { createSalesPerson, getSalesPeople, updateSalesPerson } from '@/services/sales-person-service'

export async function GET() {
  const auth = await requireOrganizationAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    return NextResponse.json(await getSalesPeople(auth.organizationId))
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireOrganizationAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = salesPersonSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    return NextResponse.json(await createSalesPerson(parsed.data, auth.organizationId), { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireOrganizationAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = salesPersonUpdateSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    return NextResponse.json(await updateSalesPerson(parsed.data, auth.organizationId))
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireOrganizationAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = z.object({ id: z.string().uuid(), is_active: z.boolean() }).safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })

  try {
    return NextResponse.json(await updateSalesPerson(parsed.data, auth.organizationId))
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
