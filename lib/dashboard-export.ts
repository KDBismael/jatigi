import { CHANNEL_LABELS } from '@/lib/constants'
import type { DateRange } from '@/lib/date-periods'
import type {
  DashboardStats,
  ProductPerformance,
  ChannelStat,
  RevenueByPeriod,
} from '@/types/analytics'

export interface AnalyticsData {
  stats: DashboardStats
  products: ProductPerformance[]
  channels: ChannelStat[]
  revenue: RevenueByPeriod[]
}

/** "Résumé" sheet: one row per KPI. Numeric values stay raw so Excel can sum them. */
export function buildSummaryRows(stats: DashboardStats, periodLabel: string) {
  return [
    { Indicateur: 'Période', Valeur: periodLabel as string | number },
    { Indicateur: "Chiffre d'affaires (FCFA)", Valeur: stats.total_revenue },
    { Indicateur: 'Bénéfice net (FCFA)', Valeur: stats.net_profit },
    { Indicateur: 'Total commandes', Valeur: stats.total_orders },
    { Indicateur: 'Livrées', Valeur: stats.delivered_orders },
    { Indicateur: 'En cours', Valeur: stats.in_progress_orders },
    { Indicateur: 'Annulées', Valeur: stats.cancelled_orders },
  ]
}

/** "Produits" sheet: product performance. */
export function buildProductRows(products: ProductPerformance[]) {
  return products.map((p) => ({
    Produit: p.product_name,
    'Quantité vendue': p.total_quantity,
    "Chiffre d'affaires (FCFA)": p.total_revenue,
    'Bénéfice (FCFA)': p.total_profit,
  }))
}

/** "Canaux" sheet: orders + revenue per acquisition channel. */
export function buildChannelRows(channels: ChannelStat[]) {
  return channels.map((c) => ({
    Canal: CHANNEL_LABELS[c.channel],
    Commandes: c.order_count,
    "Chiffre d'affaires (FCFA)": c.revenue,
  }))
}

/** "Évolution" sheet: revenue/profit timeseries. */
export function buildRevenueRows(revenue: RevenueByPeriod[]) {
  return revenue.map((r) => ({
    Date: r.date,
    "Chiffre d'affaires (FCFA)": r.revenue,
    'Bénéfice (FCFA)': r.profit,
  }))
}

export function exportFilename(range: DateRange): string {
  return `warko-tableau-de-bord-${range.dateFrom}_${range.dateTo}.xlsx`
}

/**
 * Build the multi-sheet workbook and trigger a browser download.
 * `xlsx` is lazy-imported so it stays out of the initial bundle.
 */
export async function exportDashboardToExcel(
  data: AnalyticsData,
  periodLabel: string,
  range: DateRange,
): Promise<void> {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildSummaryRows(data.stats, periodLabel)), 'Résumé')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildProductRows(data.products)), 'Produits')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildChannelRows(data.channels)), 'Canaux')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildRevenueRows(data.revenue)), 'Évolution')

  XLSX.writeFile(wb, exportFilename(range))
}
