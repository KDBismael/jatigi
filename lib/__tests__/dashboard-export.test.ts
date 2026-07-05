import { describe, expect, it } from 'vitest'
import {
  buildSummaryRows,
  buildProductRows,
  buildChannelRows,
  buildRevenueRows,
  exportFilename,
} from '@/lib/dashboard-export'
import type { DashboardStats, ProductPerformance, ChannelStat, RevenueByPeriod } from '@/types/analytics'

const stats: DashboardStats = {
  total_revenue: 656_404,
  net_profit: 152_084,
  total_orders: 42,
  delivered_orders: 30,
  cancelled_orders: 2,
  in_progress_orders: 10,
}

describe('buildSummaryRows', () => {
  it('produit une ligne par indicateur avec des valeurs numériques', () => {
    const rows = buildSummaryRows(stats, '30 derniers jours')
    expect(rows[0]).toEqual({ Indicateur: 'Période', Valeur: '30 derniers jours' })
    expect(rows).toContainEqual({ Indicateur: "Chiffre d'affaires (FCFA)", Valeur: 656_404 })
    expect(rows).toContainEqual({ Indicateur: 'Bénéfice net (FCFA)', Valeur: 152_084 })
    expect(rows).toContainEqual({ Indicateur: 'Total commandes', Valeur: 42 })
    expect(rows).toContainEqual({ Indicateur: 'Livrées', Valeur: 30 })
    expect(rows).toContainEqual({ Indicateur: 'En cours', Valeur: 10 })
    expect(rows).toContainEqual({ Indicateur: 'Annulées', Valeur: 2 })
  })
})

describe('buildProductRows', () => {
  it('mappe chaque produit avec en-têtes français et nombres bruts', () => {
    const products: ProductPerformance[] = [
      { product_id: 'p1', product_name: 'Parfum 100ml', total_quantity: 394, total_revenue: 656_404, total_profit: 152_084 },
    ]
    expect(buildProductRows(products)).toEqual([
      { Produit: 'Parfum 100ml', 'Quantité vendue': 394, "Chiffre d'affaires (FCFA)": 656_404, 'Bénéfice (FCFA)': 152_084 },
    ])
  })

  it('retourne un tableau vide sans produit', () => {
    expect(buildProductRows([])).toEqual([])
  })
})

describe('buildChannelRows', () => {
  it('convertit le canal en libellé français', () => {
    const channels: ChannelStat[] = [
      { channel: 'tiktok', order_count: 20, revenue: 500_000 },
      { channel: 'other', order_count: 3, revenue: 12_000 },
    ]
    expect(buildChannelRows(channels)).toEqual([
      { Canal: 'TikTok', Commandes: 20, "Chiffre d'affaires (FCFA)": 500_000 },
      { Canal: 'Autre', Commandes: 3, "Chiffre d'affaires (FCFA)": 12_000 },
    ])
  })
})

describe('buildRevenueRows', () => {
  it('mappe la série temporelle', () => {
    const revenue: RevenueByPeriod[] = [{ date: '2026-07-05', revenue: 30_000, profit: 8_000 }]
    expect(buildRevenueRows(revenue)).toEqual([
      { Date: '2026-07-05', "Chiffre d'affaires (FCFA)": 30_000, 'Bénéfice (FCFA)': 8_000 },
    ])
  })
})

describe('exportFilename', () => {
  it('inclut la plage de dates', () => {
    expect(exportFilename({ dateFrom: '2026-07-01', dateTo: '2026-07-05' }))
      .toBe('warko-tableau-de-bord-2026-07-01_2026-07-05.xlsx')
  })
})
