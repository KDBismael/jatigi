// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { OrderForm } from '@/components/orders/order-form'
import type { Product } from '@/types/product'
afterEach(cleanup)

describe('saisie avec un catalogue volumineux', () => {
  it('conserve les calculs après suppression et décalage des lignes', () => {
    const product = { id: 'product', name: 'Parfum', pricing_mode: 'unit', sale_price: 5000, stock_quantity: 100, is_active: true } as Product
    render(<OrderForm products={[product]} drivers={[]} sellers={[]} lives={[]} onSubmit={async () => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '+ Ajouter' }))
    for (const index of [0, 1]) {
      fireEvent.change(document.querySelector(`select[name="lines.${index}.product_id"]`)!, { target: { value: product.id } })
    }
    fireEvent.change(document.querySelector('input[name="lines.1.quantity"]')!, { target: { value: '3' } })
    fireEvent.change(screen.getAllByLabelText('Remise sur la ligne')[1], { target: { value: 'amount' } })
    fireEvent.change(screen.getByLabelText('Montant sur la ligne (FCFA)'), { target: { value: '1000' } })
    fireEvent.change(screen.getByLabelText('Motif de la remise (obligatoire)'), { target: { value: 'Promotion' } })
    fireEvent.click(screen.getAllByRole('button', { name: '✕' })[0])
    expect(screen.getAllByText(/14.?000/).length).toBeGreaterThan(0)
    fireEvent.change(document.querySelector('input[name="lines.0.quantity"]')!, { target: { value: '2' } })
    expect(screen.getAllByText(/9.?000/).length).toBeGreaterThan(0)
    fireEvent.change(screen.getByLabelText('Remise sur la ligne'), { target: { value: 'none' } })
    expect(screen.getAllByText(/10.?000/).length).toBeGreaterThan(0)
    expect(screen.queryByLabelText('Motif de la remise (obligatoire)')).toBeNull()
  })

  it('ne reconstruit pas les libellés du catalogue en tapant un motif de remise', () => {
    let labelReads = 0
    const products = Array.from({ length: 500 }, (_, index) => ({
      id: `10000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      get name() { labelReads++; return `Produit ${index}` },
      pricing_mode: 'unit', sale_price: 5000, stock_quantity: 100, is_active: true,
    } as Product))
    render(<OrderForm products={products} drivers={[]} sellers={[]} lives={[]} onSubmit={async () => {}} />)
    for (let i = 0; i < 7; i++) fireEvent.click(screen.getByRole('button', { name: '+ Ajouter' }))
    fireEvent.change(document.querySelector('select[name="lines.0.product_id"]')!, { target: { value: products[0].id } })
    fireEvent.change(screen.getAllByLabelText('Remise sur la ligne')[0], { target: { value: 'amount' } })
    fireEvent.change(screen.getByLabelText('Montant sur la ligne (FCFA)'), { target: { value: '100' } })
    labelReads = 0
    fireEvent.change(screen.getByLabelText('Motif de la remise (obligatoire)'), { target: { value: 'Promotion' } })
    expect(screen.getAllByText(/4.?900/).length).toBeGreaterThan(0)
    expect(labelReads).toBeLessThan(10)
  })
})
