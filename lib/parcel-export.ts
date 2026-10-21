import { z } from 'zod'
import { CHANNEL_LABELS, STATUS_LABELS, type Channel, type OrderStatus } from '@/lib/constants'
import { orderAmounts } from '@/lib/order-amounts'

export const parcelExportSchema = z.object({
  status: z.enum(['all', 'delivered', 'not_delivered']).default('all'),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
}).refine(filters => !filters.from || !filters.to || filters.from <= filters.to, {
  message: 'La date de début doit précéder la date de fin',
})
export type ParcelExportFilters = z.infer<typeof parcelExportSchema>

export interface ParcelExportOrder {
  id: string
  order_date: string
  client_name: string
  client_phone: string | null
  channel: Channel
  status: OrderStatus
  delivery_location: string | null
  delivery_fee: number
  confirmation_amount: number
  delivery_driver: { name: string } | null
  order_lines: {
    quantity: number
    unit_price: number | null
    line_total?: number
    discount_amount?: number
    product: { name: string } | null
  }[]
}

function parcelRow(order: ParcelExportOrder) {
  const amounts = orderAmounts(order.order_lines, order.delivery_fee, order.confirmation_amount)
  return {
    Commande: order.id,
    Date: order.order_date,
    Client: order.client_name,
    Téléphone: order.client_phone ?? '',
    Produits: order.order_lines.map(line => `${line.product?.name ?? 'Produit supprimé'} × ${line.quantity}`).join('; '),
    Livreur: order.delivery_driver?.name ?? '',
    'Lieu de livraison': order.delivery_location ?? '',
    Canal: CHANNEL_LABELS[order.channel],
    Statut: STATUS_LABELS[order.status],
    'Livraison (FCFA)': amounts.deliveryFee,
    'Total (FCFA)': amounts.totalAmount,
    'Remises (FCFA)': order.order_lines.reduce((sum, line) => sum + Number(line.discount_amount ?? 0), 0),
    'Dépôt (FCFA)': amounts.confirmationAmount,
    'Reste à payer (FCFA)': amounts.remainingAmount,
  }
}
type ParcelRow = ReturnType<typeof parcelRow>
export interface ParcelExportReport { delivered: ParcelRow[]; notDelivered: ParcelRow[] }
const headers: (keyof ParcelRow)[] = ['Commande', 'Date', 'Client', 'Téléphone', 'Produits', 'Livreur',
  'Lieu de livraison', 'Canal', 'Statut', 'Livraison (FCFA)', 'Total (FCFA)', 'Remises (FCFA)', 'Dépôt (FCFA)', 'Reste à payer (FCFA)']

export function buildParcelExport(orders: ParcelExportOrder[]): ParcelExportReport {
  const report: ParcelExportReport = { delivered: [], notDelivered: [] }
  for (const order of orders) report[order.status === 'delivered' ? 'delivered' : 'notDelivered'].push(parcelRow(order))
  return report
}

export function parcelCsv(report: ParcelExportReport): string {
  function cell(value: string | number) {
    const text = String(value)
    const safe = typeof value === 'string' && /^[\s\uFEFF]*[=+@-]/.test(text) ? `'${text}` : text
    return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
  }
  return [headers.join(','), ...[...report.delivered, ...report.notDelivered].map(row => headers.map(key => cell(row[key])).join(','))].join('\r\n') + '\r\n'
}

export async function parcelWorkbook(report: ParcelExportReport) {
  const XLSX = await import('xlsx')
  const workbook = XLSX.utils.book_new()
  for (const [name, rows] of [['Livrés', report.delivered], ['Non livrés', report.notDelivered]] as const) {
    const sheet = XLSX.utils.json_to_sheet(rows, { header: headers })
    XLSX.utils.book_append_sheet(workbook, sheet, name)
  }
  return workbook
}

export async function downloadParcelExport(report: ParcelExportReport, format: 'xlsx' | 'csv') {
  const filename = `warko-colis-${new Date().toISOString().slice(0, 10)}`
  if (format === 'xlsx') {
    const XLSX = await import('xlsx')
    XLSX.writeFile(await parcelWorkbook(report), `${filename}.xlsx`)
    return
  }
  const url = URL.createObjectURL(new Blob(['\uFEFF', parcelCsv(report)], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
