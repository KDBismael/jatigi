// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import DashboardPage from '@/app/(app)/dashboard/page'
import { formatAmount } from '@/lib/utils'

const mocks = vi.hoisted(() => ({ analytics: vi.fn(), export: vi.fn() }))
vi.mock('@/hooks/use-analytics', () => ({ useAnalytics: mocks.analytics }))
vi.mock('@/hooks/use-subscription', () => ({ useSubscription: () => ({ summary: null }) }))
vi.mock('@/components/billing/billing-usage-banner', () => ({ BillingUsageBanner: () => null }))
vi.mock('@/components/onboarding/checklist', () => ({ OnboardingChecklist: () => null }))
vi.mock('@/stores/auth-store', () => ({ useAuthStore: () => ({ profile: { full_name: 'Awa Koné' } }) }))
vi.mock('@/components/dashboard/revenue-chart', () => ({ RevenueChart: () => <div>Graphique</div> }))
vi.mock('@/lib/dashboard-export', () => ({ exportDashboardToExcel: mocks.export }))
const metrics = { revenue: 900000, estimated_profit: 400000, average_basket: 30000, total_orders: 31, delivered_orders: 30, cancelled_orders: 1, expense_total: 5000, cost_of_goods: 495000 }
const data = { stats: { total_revenue: 60000, net_profit: -5000, total_orders: 5, delivered_orders: 3, in_progress_orders: 1, cancelled_orders: 1 }, today: metrics, month: metrics, goals: [], products: [], channels: [], revenue: [], sellerPerformance: [], livePerformance: [], slotPerformance: [] }
afterEach(() => { cleanup(); vi.clearAllMocks() })
it('affiche quatre KPI de la période et calcule le panier sur les commandes livrées', () => {
 mocks.analytics.mockReturnValue({ data, isLoading: false, error: null })
 render(<DashboardPage />)
 const kpis = screen.getByRole('region', { name: 'Indicateurs de la période' })
 expect(within(kpis).getByText(formatAmount(20000).replace(/\s/g, ' '))).toBeTruthy()
 expect(within(kpis).getByText(formatAmount(-5000).replace(/\s/g, ' '))).toBeTruthy()
 expect(within(kpis).queryByText(formatAmount(900000).replace(/\s/g, ' '))).toBeNull()
 expect(screen.getByRole('region', { name: 'Commandes par statut' })).toBeTruthy()
 fireEvent.click(screen.getByRole('button', { name: '7 jours' }))
 const range = mocks.analytics.mock.calls.at(-1)?.[0]
 expect(range.dateFrom).not.toBe(range.dateTo)
 fireEvent.click(screen.getByRole('button', { name: 'Exporter en Excel' }))
 expect(mocks.export).toHaveBeenCalledWith(data, '7 jours', range)
})
it('garde un panier nul sans livraison et conserve les états vides et le bloc mensuel', () => {
 mocks.analytics.mockReturnValue({ data: { ...data, stats: { ...data.stats, total_revenue: 0, delivered_orders: 0 } }, isLoading: false, error: null })
 render(<DashboardPage />)
 const kpis = screen.getByRole('region', { name: 'Indicateurs de la période' })
 expect(within(kpis).getAllByText('0').length).toBe(2)
 expect(screen.getByText('Collecte des données en cours')).toBeTruthy()
 expect(screen.getByRole('region', { name: 'Performance mensuelle' })).toBeTruthy()
 expect(screen.getByText('Aucun objectif défini')).toBeTruthy()
})
it('conserve un message explicite en cas d’erreur', () => {
 mocks.analytics.mockReturnValue({ data: null, isLoading: false, error: 'Accès refusé' })
 render(<DashboardPage />)
 expect(screen.getByText('Impossible de charger le tableau de bord')).toBeTruthy()
})
it('annonce la période active et conserve la sélection personnalisée', () => {
 mocks.analytics.mockReturnValue({ data, isLoading: false, error: null })
 const view=render(<DashboardPage />)
 expect(screen.getByRole('group',{name:'Période'})).toBeTruthy()
 expect(screen.getByRole('button',{name:"Aujourd'hui"}).getAttribute('aria-pressed')).toBe('true')
 fireEvent.click(screen.getByRole('button',{name:'Personnalisé'}))
 const dates=view.container.querySelectorAll('input[type="date"]')
 fireEvent.change(dates[0],{target:{value:'2026-09-01'}})
 fireEvent.change(dates[1],{target:{value:'2026-09-12'}})
 fireEvent.click(screen.getByRole('button',{name:'Appliquer'}))
 expect(mocks.analytics.mock.calls.at(-1)?.[0]).toEqual({dateFrom:'2026-09-01',dateTo:'2026-09-12'})
})
it('conserve les ventes mensuelles, les vendeurs et les sessions live sous les KPI', () => {
 const monthlyData = { ...data, goals: [{scope:'global',amount:1000000}], sellerPerformance: [{seller_id:'s1',seller_name:'Awa Koné',rank:1,order_count:3,average_basket:20000,revenue:60000,progress:60}], livePerformance: [{live_session_id:'l1',name:'Présentation du soir',session_date:'2026-10-29',revenue:60000}], slotPerformance: [{slot:'evening',order_count:3,revenue:60000,is_best:true}] }
 mocks.analytics.mockReturnValue({ data: monthlyData, isLoading: false, error: null })
 render(<DashboardPage />)
 const monthly=screen.getByRole('region',{name:'Performance mensuelle'})
 expect(within(monthly).getByText('Awa Koné')).toBeTruthy()
 expect(within(monthly).getByText(/Présentation du soir/)).toBeTruthy()
 expect(within(monthly).getByText('Meilleur créneau', {exact:false})).toBeTruthy()
 expect(within(monthly).getByText('90.0 %')).toBeTruthy()
})
