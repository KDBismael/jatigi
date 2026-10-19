import { z } from 'zod'
import { STATUSES } from '@/lib/constants'

export const customerExportSchema = z.object({
  productId: z.string().uuid().optional(),
  status: z.enum(['all', ...STATUSES]).default('delivered'),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
}).refine((filters) => !filters.from || !filters.to || filters.from <= filters.to, {
  message: 'La date de début doit précéder la date de fin',
})
export type CustomerExportFilters = z.infer<typeof customerExportSchema>

export interface CustomerExportOrder {
  id: string
  client_name: string
  client_phone: string | null
  order_date: string
  order_lines: { product_id: string; product: { name: string } | null }[]
}
export interface ExportCustomer {
  name: string
  phone: string
  orderCount: number
  firstOrderDate: string
  lastOrderDate: string
  products: string[]
}
export interface CustomerExportReport {
  customers: ExportCustomer[]
  matchedOrders: number
  excludedOrders: number
  duplicateOrders: number
}

/** Local numbers are interpreted as Côte d'Ivoire mobile numbers only. */
export function normalizeCustomerPhone(value: string | null): string | null {
  if (!value?.trim() || !/^\+?[\d\s().-]+$/.test(value.trim())) return null
  const raw = value.trim()
  let digits = raw.replace(/\D/g, '')
  const international = raw.startsWith('+') || digits.startsWith('00')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (!international && /^(01|05|07)\d{8}$/.test(digits)) digits = `225${digits}`
  else if (!international && digits.length < 11) return null
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null
  if (digits.startsWith('225') && !/^225(01|05|07|21|25|27)\d{8}$/.test(digits)) return null
  return digits
}

export function buildCustomerExport(orders: CustomerExportOrder[]): CustomerExportReport {
  const customers = new Map<string, ExportCustomer>()
  let excludedOrders = 0
  let duplicateOrders = 0
  for (const order of orders) {
    const phone = normalizeCustomerPhone(order.client_phone)
    if (!phone) { excludedOrders++; continue }
    const products = order.order_lines.map(line => line.product?.name).filter((name): name is string => Boolean(name))
    const existing = customers.get(phone)
    if (existing) {
      duplicateOrders++
      existing.orderCount++
      existing.firstOrderDate = [existing.firstOrderDate, order.order_date].sort()[0]
      if (order.order_date > existing.lastOrderDate) {
        existing.lastOrderDate = order.order_date
        existing.name = order.client_name
      }
      existing.products = [...new Set([...existing.products, ...products])].sort()
    } else {
      customers.set(phone, { name: order.client_name, phone, orderCount: 1,
        firstOrderDate: order.order_date, lastOrderDate: order.order_date,
        products: [...new Set(products)].sort() })
    }
  }
  return { customers: [...customers.values()].sort((a, b) => a.phone.localeCompare(b.phone)), matchedOrders: orders.length, excludedOrders, duplicateOrders }
}

/** Minimal audience file: numeric identifiers only, one customer per row. */
export function customerCsv(customers: ExportCustomer[]): string {
  return ['phone', ...customers.map(customer => customer.phone)].join('\r\n') + '\r\n'
}

export async function downloadCustomerExport(report: CustomerExportReport, format: 'csv' | 'xlsx') {
  const filename = `warko-clients-${new Date().toISOString().slice(0, 10)}`
  if (format === 'xlsx') {
    const XLSX = await import('xlsx')
    const workbook = XLSX.utils.book_new()
    const rows = report.customers.map(customer => ({
      Nom: customer.name, Téléphone: customer.phone, Commandes: customer.orderCount,
      'Première commande': customer.firstOrderDate, 'Dernière commande': customer.lastOrderDate,
      Produits: customer.products.join(', '),
    }))
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Clients')
    XLSX.writeFile(workbook, `${filename}.xlsx`)
    return
  }
  const url = URL.createObjectURL(new Blob([customerCsv(report.customers)], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
