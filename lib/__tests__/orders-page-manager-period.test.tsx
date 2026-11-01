// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import { getPeriodDates } from '@/lib/date-periods'

const mocks = vi.hoisted(() => ({ setFilters: vi.fn(), role: 'manager' }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/hooks/use-orders', () => ({
  useOrders: () => ({ orders: [], filters: {}, isLoading: false, updateStatus: vi.fn(), setFilters: mocks.setFilters }),
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (select?: (state: unknown) => unknown) => {
    const state = { profile: { role: mocks.role }, organization: { name: 'BON PLAN CI' }, isAdmin: () => mocks.role === 'admin' }
    return select ? select(state) : state
  },
}))
import OrdersPage from '@/app/(app)/orders/page'

afterEach(() => { cleanup(); mocks.setFilters.mockReset() })

it('opens the last 7 days for a delivery manager', async () => {
  mocks.role = 'manager'
  render(<OrdersPage />)
  await waitFor(() => expect(mocks.setFilters).toHaveBeenLastCalledWith(getPeriodDates('last7d')))
})

it('keeps today for admins and employees', async () => {
  mocks.role = 'employee'
  render(<OrdersPage />)
  await waitFor(() => expect(mocks.setFilters).toHaveBeenLastCalledWith(getPeriodDates('today')))
})
