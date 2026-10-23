// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import NewOrderPage from '@/app/(app)/orders/new/page'
const mocks = vi.hoisted(() => ({ create: vi.fn(), push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('@/hooks/use-orders', () => ({ useOrders: () => ({ create: mocks.create }) }))
vi.mock('@/hooks/use-products', () => ({ useProducts: () => ({ products: [] }) }))
vi.mock('@/hooks/use-delivery-drivers', () => ({ useDeliveryDrivers: () => ({ drivers: [] }) }))
vi.mock('@/hooks/use-order-options', () => ({ useOrderOptions: () => ({ sellers: [], lives: [] }) }))
vi.mock('@/components/orders/order-form', () => ({ OrderForm: (props: { onSubmit: (data: object) => void; onSaveAndPrint?: (data: object) => void }) => <>
  <button onClick={() => props.onSubmit({ client_name: 'Awa' })}>Save only</button>
  <button onClick={() => props.onSaveAndPrint?.({ client_name: 'Awa' })}>Save and print</button>
</> }))
afterEach(() => { cleanup(); vi.resetAllMocks() })
describe('enregistrer et imprimer', () => {
  it('enregistre une seule fois puis ouvre le sélecteur sur la commande réellement créée', async () => {
    let resolve!: (value: { id: string }) => void
    mocks.create.mockReturnValue(new Promise(done => { resolve = done }))
    render(<NewOrderPage />)
    fireEvent.click(screen.getByText('Save and print'))
    fireEvent.click(screen.getByText('Save and print'))
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.push).not.toHaveBeenCalled()
    resolve({ id: 'created-order' })
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/orders/created-order/print?print=1'))
  })
  it('n’ouvre aucune impression si l’enregistrement échoue et permet de réessayer', async () => {
    mocks.create.mockRejectedValueOnce(new Error('Stock insuffisant')).mockResolvedValueOnce({ id: 'retry-order' })
    render(<NewOrderPage />)
    fireEvent.click(screen.getByText('Save and print'))
    await screen.findByText(/Stock insuffisant/)
    expect(mocks.push).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Save and print'))
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/orders/retry-order/print?print=1'))
  })
  it('conserve l’enregistrement simple sans impression', async () => {
    mocks.create.mockResolvedValue({ id: 'order' })
    render(<NewOrderPage />)
    fireEvent.click(screen.getByText('Save only'))
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/orders'))
  })
})
