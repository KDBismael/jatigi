// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { SaasMetrics, ratio } from '@/components/admin/saas-metrics'
import type { PlatformSaasMetrics } from '@/services/platform-service'

afterEach(cleanup)

const metrics: PlatformSaasMetrics = {
  mode: 'live', signups: 30, onboardingComplete: 7, day1Eligible: 9, day1Activated: 2, day7Eligible: 10, day7Activated: 2,
  retentionM1Eligible: 8, retentionM1Active: 1, retentionM3Eligible: 3, retentionM3Active: 1, paidOrganizations: 0, mrr: 0,
  paidAtMonthStart: 0, paidLostThisMonth: 0, ordersLast7Days: 120, ordersThisMonth: 276, activeOrganizationsThisMonth: 3,
}

it('computes rounded percentages and refuses an empty cohort', () => {
  expect(ratio(7, 30)).toBe(23)
  expect(ratio(1, 3)).toBe(33)
  expect(ratio(0, 0)).toBeNull()
  expect(ratio(5, 4)).toBe(100)
})

it('groups metrics with their value, cohort size and progress', () => {
  render(<SaasMetrics saas={metrics} />)
  const activation = screen.getByRole('region', { name: 'Activation' })
  const onboarding = within(activation).getByRole('group', { name: 'Onboarding réel terminé' })
  expect(onboarding.textContent).toContain('23 %')
  expect(onboarding.textContent).toContain('7 sur 30 boutiques')
  expect(within(onboarding).getByRole('progressbar').getAttribute('aria-valuenow')).toBe('23')

  const retention = screen.getByRole('region', { name: 'Rétention' })
  expect(within(retention).getByRole('group', { name: 'Rétention au mois 4' }).textContent).toContain('33 %')
  const churn = within(retention).getByRole('group', { name: 'Churn payé du mois en cours' })
  expect(churn.textContent).toContain('Aucune cohorte éligible')
  expect(within(churn).queryByRole('progressbar')).toBeNull()

  const usage = screen.getByRole('region', { name: 'Revenus et usage' })
  expect(within(usage).getByRole('group', { name: 'Commandes par boutique active ce mois' }).textContent).toContain('92')
})

it('flags test payments only in test mode', () => {
  const { rerender } = render(<SaasMetrics saas={metrics} />)
  expect(screen.queryByText('Paiements de test')).toBeNull()
  rerender(<SaasMetrics saas={{ ...metrics, mode: 'test' }} />)
  expect(screen.getByText('Paiements de test')).toBeTruthy()
})
