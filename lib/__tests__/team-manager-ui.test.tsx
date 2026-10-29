// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
const mocks = vi.hoisted(() => ({ changeRole: vi.fn() }))
vi.mock('@/hooks/use-team', () => ({ useTeam: () => ({ members: [{ id: 'member', full_name: 'Awa', role: 'employee', created_at: '2026-10-29' }], isLoading: false, changeRole: mocks.changeRole }) }))
vi.mock('@/hooks/use-sales-people', () => ({ useSalesPeople: () => ({ people: [], isLoading: false }) }))
import TeamPage from '@/app/(app)/team/page'
afterEach(() => { cleanup(); vi.resetAllMocks() })
it('lets an admin explicitly select delivery manager for an existing member', () => {
 render(<TeamPage />)
 const select = screen.getByRole('combobox', { name: 'Rôle de Awa' })
 expect(Array.from((select as HTMLSelectElement).options).map(o => o.value)).toEqual(['employee', 'admin', 'manager'])
 fireEvent.change(select, { target: { value: 'manager' } })
 expect(mocks.changeRole).toHaveBeenCalledWith('member', 'manager')
})
it('shows role update errors beside the team even when the invitation form is closed', async () => {
 mocks.changeRole.mockRejectedValue(new Error('Forbidden'))
 render(<TeamPage />)
 fireEvent.change(screen.getByRole('combobox', { name: 'Rôle de Awa' }), { target: { value: 'manager' } })
 expect(await screen.findByText('Impossible de modifier le rôle de ce membre.')).toBeTruthy()
})
