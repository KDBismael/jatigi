// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { OrderPrintView } from '@/components/orders/order-print-view'
import type { OrderDocument } from '@/lib/order-document'
const documentModel: OrderDocument = { reference: 'REF', date: '23/10/2026', organizationName: 'Boutique', logoUrl: null,
  clientName: 'Awa', clientPhone: null, seller: 'Vendeur', deliveryLocation: null, deliveryDriver: null, lines: [],
  totals: { subtotal: 0, discount: 0, parcelAmount: 0, deliveryFee: 0, totalAmount: 0, confirmationAmount: 0, remainingAmount: 0 } }
beforeEach(() => {
  const stored = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => stored.set(key, value) })
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
describe('page d’impression', () => {
  it('ouvre le picker après enregistrement pour un employé et conserve le téléchargement PDF séparé', () => {
    render(<OrderPrintView orderId="order" document={documentModel} initialFormat="a4" preferenceKey="org:employee" initialOpen />)
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByLabelText(/Android/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Télécharger PDF' }).getAttribute('href')).toContain('/api/orders/order/document?format=a4')
  })
  it('mémorise le format pour le compte courant sans l’appliquer à une autre boutique', () => {
    const view = render(<OrderPrintView orderId="order" document={documentModel} initialFormat="a4" preferenceKey="org:user" />)
    fireEvent.change(screen.getByLabelText('Format d’impression'), { target: { value: '80mm' } })
    expect(document.querySelector('[data-format="80mm"]')).toBeTruthy()
    view.unmount()
    render(<OrderPrintView orderId="other" document={documentModel} initialFormat="a4" preferenceKey="other-org:user" />)
    expect(document.querySelector('[data-format="a4"]')).toBeTruthy()
  })
})
