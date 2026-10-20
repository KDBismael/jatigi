import { notFound, redirect } from 'next/navigation'
import { getOrderContext } from '@/lib/order-context'
import { buildOrderDocument, documentFormatSchema } from '@/lib/order-document'
import { getOrderById } from '@/services/order-service'
import { getOrganizationBranding } from '@/services/branding-service'
import { OrderPrintView } from '@/components/orders/order-print-view'

export default async function PrintOrderPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ format?: string }>
}) {
  const ctx = await getOrderContext()
  if (!ctx) redirect('/auth/login')
  const { id } = await params
  const order = await getOrderById(id, ctx.profile.organization_id)
  if (!order) notFound()
  const branding = await getOrganizationBranding(ctx.profile.organization_id)
  const format = documentFormatSchema.safeParse((await searchParams).format ?? 'a4')
  return <OrderPrintView orderId={id} document={buildOrderDocument(order, branding.name, branding.logoUrl)} initialFormat={format.success ? format.data : 'a4'} />
}
