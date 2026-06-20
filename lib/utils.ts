import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr))
}

export function resolveUnitCost(
  storedCost: number,
  product?: { purchase_cost?: number; import_cost?: number; packaging_cost?: number } | null,
): number {
  if (storedCost > 0) return storedCost
  return (product?.purchase_cost ?? 0) + (product?.import_cost ?? 0) + (product?.packaging_cost ?? 0)
}

export function computeMargin(params: {
  sale_price: number
  purchase_cost: number
  import_cost: number
  packaging_cost: number
}): number {
  return params.sale_price - (params.purchase_cost + params.import_cost + params.packaging_cost)
}
