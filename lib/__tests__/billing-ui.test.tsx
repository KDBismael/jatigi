// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SubscriptionView } from '@/components/billing/subscription-view'
import { BillingUsageBanner } from '@/components/billing/billing-usage-banner'
import LandingPage from '@/app/(landing)/page'
import type { SubscriptionSummary } from '@/lib/billing/plans'
const summary: SubscriptionSummary = {
  plan: 'discovery',
  cycle: null,
  status: 'free',
  periodEnd: null,
  cancelAtPeriodEnd: false,
  pendingPlan: null,
  usage: { orders: 95, drivers: 1, users: 1 },
  limits: { orders: 100, drivers: 1, users: 1 },
  canManageBilling: true,
  payments: [],
}
afterEach(cleanup)
it('shows honest COD positioning and signup pricing without fabricated testimonials', () => {
  render(<LandingPage />)
  expect(screen.getByRole('heading', { level: 1 }).textContent?.replace(/\s/g, " ")).toContain(
    'vos livreurs',
  )
  expect(
    screen
      .getAllByRole('link', { name: /Essayer gratuitement/ })[0]
      .getAttribute('href'),
  ).toBe('/auth/signup')
  fireEvent.click(screen.getByTestId('pricing-toggle-annual'))
  expect(screen.getByTestId('pricing-price-pro').textContent?.replace(/\s/g, " ")).toBe('48 000')
  expect(screen.queryByText('5K+')).toBeNull()
})
it('warns at 95 orders and explains preserved existing orders at cap', () => {
  const { rerender } = render(<BillingUsageBanner summary={summary} />)
  expect(screen.getByText(/Plus que 5 commandes/)).toBeTruthy()
  rerender(
    <BillingUsageBanner
      summary={{ ...summary, usage: { ...summary.usage, orders: 100 } }}
    />,
  )
  expect(screen.getByText(/commandes existantes restent/)).toBeTruthy()
})
it('hides checkout and billing mutations for non owners', () => {
  render(
    <SubscriptionView
      summary={{ ...summary, canManageBilling: false }}
      onCheckout={vi.fn()}
      onAction={vi.fn()}
      busy={false}
    />,
  )
  expect(screen.queryByRole('button', { name: /Choisir Pro/ })).toBeNull()
  expect(screen.getByText(/propriétaire/)).toBeTruthy()
})
it('selects annual cycle with exact price and savings then requests only the selected plan', () => {
  const checkout = vi.fn()
  render(
    <SubscriptionView
      summary={summary}
      onCheckout={checkout}
      onAction={vi.fn()}
      busy={false}
    />,
  )
  fireEvent.click(screen.getByTestId('subscription-cycle-yearly'))
  expect(screen.getByText(/Économisez 12 000/)).toBeTruthy()
  fireEvent.click(screen.getByTestId('subscription-choose-pro'))
  expect(checkout).toHaveBeenCalledWith('pro', 'yearly')
})
it('lets the owner renew the current paid plan without switching plans', () => {
  const checkout = vi.fn()
  render(
    <SubscriptionView
      summary={{
        ...summary,
        plan: 'pro',
        status: 'active',
        cycle: 'monthly',
        periodEnd: '2026-11-01T00:00:00Z',
      }}
      onCheckout={checkout}
      onAction={vi.fn()}
      busy={false}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Renouveler Pro' }))
  expect(checkout).toHaveBeenCalledWith('pro', 'monthly')
})
