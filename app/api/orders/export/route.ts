import { NextRequest, NextResponse } from 'next/server'
import { requireOrganizationAdmin } from '@/lib/admin-context'
import { parcelExportSchema } from '@/lib/parcel-export'
import { getParcelExport } from '@/services/parcel-export-service'

export async function GET(request: NextRequest) {
  const auth = await requireOrganizationAdmin()
  if (!auth) return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
  const parsed = parcelExportSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success) return NextResponse.json({ error: 'Filtres invalides : vérifiez le statut et les dates' }, { status: 400 })
  try {
    const report = await getParcelExport(auth.organizationId, parsed.data)
    return NextResponse.json(report, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'Impossible de préparer l’export des colis. Réessayez.' }, { status: 500 })
  }
}
