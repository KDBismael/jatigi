// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import DeliveriesPage from '@/app/(app)/deliveries/page'
import type { DeliveryDriverSummary } from '@/types/delivery-driver'
const mocks = vi.hoisted(() => ({ setActive: vi.fn(), create: vi.fn(), isAdmin: true, plan: "pro" }))
vi.mock('@/hooks/use-subscription', () => ({useSubscription: () => ({summary:{plan:mocks.plan}})}))
vi.mock('@/hooks/use-role', () => ({ useRole: () => ({ isAdmin: mocks.isAdmin, canManageDeliveries: true }) }))
vi.mock('@/components/deliveries/daily-delivery-balance', () => ({ DailyDeliveryBalance: () => <p>Bilan quotidien</p> }))
vi.mock('@/hooks/use-delivery-drivers', () => ({ useDeliveryDrivers: () => ({ drivers: [
  { id: 'active', name: 'Actuel', is_active: true, amount_collected: 5000, amount_remitted: 3000, amount_due: 2000, packages_in_progress: 1, packages_delivered: 1, packages_cancelled: 0, success_rate: 100 },
  { id: 'archived', name: 'Ancien', is_active: false, amount_collected: 8000, amount_remitted: 6000, amount_due: 2000, packages_in_progress: 0, packages_delivered: 1, packages_cancelled: 0, success_rate: 100 },
] as DeliveryDriverSummary[], isLoading: false, setActive: mocks.setActive, create: mocks.create }) }))
afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.isAdmin = true; mocks.plan = "pro" })
describe('livreurs actifs et archivés', () => {
  it('conserve le solde global et permet de restaurer ou solder un ancien livreur', () => {
    render(<DeliveriesPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Suivi global et versements' }))
    expect(screen.queryByText('Ancien')).toBeNull()
    expect(screen.getAllByText(/4.?000/).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Archivés (1)' }))
    expect(screen.getAllByText('Ancien').length).toBeGreaterThan(0)
    expect(screen.queryByText('Actuel')).toBeNull()
    expect(screen.getAllByRole('button', { name: 'Enregistrer un versement' }).length).toBeGreaterThan(0)
    fireEvent.click(screen.getAllByRole('button', { name: 'Restaurer' })[0])
    expect(mocks.setActive).toHaveBeenCalledWith('archived', true)
  })
  it('permet d’archiver un actif, sans action de suppression définitive', () => {
    render(<DeliveriesPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Suivi global et versements' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Archiver' })[0])
    expect(mocks.setActive).toHaveBeenCalledWith('active', false)
    expect(screen.queryByRole('button', { name: /Supprimer/ })).toBeNull()
  })
  it('donne au responsable le bilan et les versements sans création ni archivage de livreur', () => {
    mocks.isAdmin = false
    render(<DeliveriesPage />)
    expect(screen.getByText('Bilan quotidien')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '+ Ajouter un livreur' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Suivi global et versements' }))
    expect(screen.queryByRole('button', { name: 'Archiver' })).toBeNull()
    expect(screen.getAllByRole('button', { name: 'Enregistrer un versement' }).length).toBeGreaterThan(0)
  })
})

it('refuse un téléphone invalide avant de créer un livreur et efface l’erreur après correction', async () => {
 render(<DeliveriesPage />)
 fireEvent.click(screen.getByRole('button', { name: 'Suivi global et versements' }))
 fireEvent.click(screen.getByRole('button', { name: '+ Ajouter un livreur' }))
 fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Koffi' } })
 fireEvent.change(screen.getByLabelText('Téléphone'), { target: { value: 'abc' } })
 fireEvent.click(screen.getByRole('button', { name: /^Ajouter$/ }))
 expect(await screen.findByText(/numéro de téléphone valide/i)).toBeTruthy()
 expect(mocks.create).not.toHaveBeenCalled()
 fireEvent.change(screen.getByLabelText('Téléphone'), { target: { value: '' } })
 expect(screen.queryByText(/numéro de téléphone valide/i)).toBeNull()
 fireEvent.click(screen.getByRole('button', { name: /^Ajouter$/ }))
 await vi.waitFor(() => expect(mocks.create).toHaveBeenCalledWith({ name: 'Koffi', phone: '' }))
})

it('opens the included global delivery tracking for Discovery without hiding the daily upgrade', () => {
 mocks.plan='discovery';render(<DeliveriesPage />)
 expect(screen.queryByText('Bilan quotidien')).toBeNull()
 expect(screen.getAllByText('Actuel').length).toBeGreaterThan(0)
 fireEvent.click(screen.getByRole('button',{name:'Bilan du jour'}))
 expect(screen.getByText('Bilan quotidien')).toBeTruthy()
})
