import { NextRequest, NextResponse } from 'next/server'
import { requireOrganizationAdmin } from '@/lib/admin-context'
import { salesPersonEvaluationSchema } from '@/lib/schemas/sales-person.schema'
import { createSalesPersonEvaluation, getSalesPersonEvaluations } from '@/services/sales-person-service'

export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireOrganizationAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params

  try {
    return NextResponse.json(await getSalesPersonEvaluations(id, auth.organizationId))
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireOrganizationAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params

  const parsed = salesPersonEvaluationSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    return NextResponse.json(
      await createSalesPersonEvaluation(id, parsed.data, auth.organizationId, auth.user.id),
      { status: 201 }
    )
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
