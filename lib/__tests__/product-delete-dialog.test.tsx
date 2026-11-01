// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
import { ProductTable } from '@/components/products/product-table'
import type { Product } from '@/types/product'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

const product = {
  id: 'p', name: 'PARFUM 100', is_active: true, sale_price: 10000, purchase_cost: 4000, import_cost: 0, packaging_cost: 0,
  stock_quantity: 3, pricing_mode: 'unit', offers: [], variants: [], images: [],
} as unknown as Product

it('tells the user why a deletion failed and closes the dialog', async () => {
  const alert = vi.spyOn(window, 'alert').mockImplementation(() => {})
  const onDelete = vi.fn().mockRejectedValue(new Error('Archivage impossible. Réessayez.'))
  render(<ProductTable products={[product]} onDelete={onDelete} />)
  fireEvent.click(screen.getAllByRole('button', { name: 'Supprimer' })[0])
  fireEvent.click(screen.getAllByRole('button', { name: 'Supprimer' }).at(-1)!)
  await waitFor(() => expect(alert).toHaveBeenCalledWith('Archivage impossible. Réessayez.'))
  expect(screen.queryByText('Supprimer "PARFUM 100" ?')).toBeNull()
})
