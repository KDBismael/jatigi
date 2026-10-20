import { NextRequest, NextResponse } from 'next/server'
import { getOrderContext } from '@/lib/order-context'
import { buildOrderDocument, documentFormatSchema } from '@/lib/order-document'
import { getOrderById } from '@/services/order-service'
import { getOrganizationBranding, getOrganizationLogoBytes } from '@/services/branding-service'
import { generateOrderPdf } from '@/services/order-pdf'
export const runtime = 'nodejs'
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrderContext()
  if (!ctx) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
  const format = documentFormatSchema.safeParse(request.nextUrl.searchParams.get('format') ?? 'a4')
  if (!format.success) return NextResponse.json({ error: 'Format invalide' }, { status: 400 })
  const { id } = await params
  const order = await getOrderById(id, ctx.profile.organization_id)
  if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  try {
    const branding = await getOrganizationBranding(ctx.profile.organization_id)
    const logo = await getOrganizationLogoBytes(ctx.profile.organization_id, branding.logoPath)
    const model = buildOrderDocument(order, branding.name)
    const pdf = await generateOrderPdf(model, format.data, logo)
    return new NextResponse(new Uint8Array(pdf), { headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="warko-commande-${model.reference}-${format.data}.pdf"`,
      'Cache-Control': 'private, no-store',
    } })
  } catch { return NextResponse.json({ error: 'Impossible de générer le PDF. Réessayez.' }, { status: 500 }) }
}
