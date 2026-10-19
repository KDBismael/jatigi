import { NextRequest, NextResponse } from 'next/server'
import { requireOrganizationAdmin } from '@/lib/admin-context'
import { customerExportSchema } from '@/lib/customer-export'
import { getCustomerExport } from '@/services/customer-export-service'

export async function GET(request: NextRequest) {
  const auth = await requireOrganizationAdmin()
  if (!auth) return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
  const parsed = customerExportSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success) return NextResponse.json({ error: 'Filtres invalides : vérifiez le produit, le canal, le statut et les dates' }, { status: 400 })
  try {
    const report = await getCustomerExport(auth.organizationId, parsed.data)
    return NextResponse.json(report, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'Impossible de préparer l’export clients. Réessayez.' }, { status: 500 })
  }
}
