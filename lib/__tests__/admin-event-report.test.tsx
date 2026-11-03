// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
vi.mock('recharts', async (original) => {
  const actual = await original<typeof import('recharts')>()
  return { ...actual, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div style={{ width: 600, height: 200 }}>{children}</div> }
})
import { EventReport } from '@/components/admin/event-report'
import type { PlatformEventReport } from '@/services/platform-service'

afterEach(cleanup)

const report: PlatformEventReport = {
  funnel: { visitors: 200, signupClicks: 40, signupViews: 30, signups: 10, firstOrder: 6, onboarded: 4, paid: 1 },
  daily: [{ day: '2026-11-02', visitors: 120, signups: 6 }, { day: '2026-11-03', visitors: 80, signups: 4 }],
  sources: [{ source: 'facebook', visitors: 120 }, { source: 'direct', visitors: 80 }],
  actions: [{ name: 'order_created', events: 54, shops: 5 }, { name: 'settlement_recorded', events: 7, shops: 2 }],
}

it('shows the funnel with step-to-step conversion', () => {
  render(<EventReport report={report} period={30} />)
  const funnel = screen.getByRole('region', { name: 'Parcours des visiteurs' })
  const signups = within(funnel).getByRole('group', { name: 'Boutiques créées' })
  expect(signups.textContent).toContain('10')
  expect(signups.textContent).toContain('33 % de l’étape précédente')
  expect(within(funnel).getByRole('group', { name: 'Abonnement payé' }).textContent).toContain('1')
})

it('lists sources and in-app actions with French labels', () => {
  render(<EventReport report={report} period={30} />)
  expect(within(screen.getByRole('region', { name: 'Provenance des visites' })).getByText('Direct')).toBeTruthy()
  const actions = screen.getByRole('region', { name: 'Actions dans l’app' })
  const row = within(actions).getByText('Commande créée').closest('tr')!
  expect(row.textContent).toContain('54')
  expect(row.textContent).toContain('5')
})

it('marks the selected period and explains an empty report', () => {
  const empty: PlatformEventReport = { funnel: { visitors: 0, signupClicks: 0, signupViews: 0, signups: 0, firstOrder: 0, onboarded: 0, paid: 0 }, daily: [], sources: [], actions: [] }
  render(<EventReport report={empty} period={7} />)
  expect(screen.getByRole('link', { name: '7 jours' }).getAttribute('aria-current')).toBe('page')
  expect(screen.getByText('Pas encore de visite enregistrée sur cette période.')).toBeTruthy()
  expect(screen.getByText('Aucune action enregistrée sur cette période.')).toBeTruthy()
})
