// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { OrderPrintView } from '@/components/orders/order-print-view'
import type { OrderDocument } from '@/lib/order-document'

const doc: OrderDocument = { reference: 'REF', date: '31/10/2026', organizationName: 'Boutique', logoUrl: null,
  clientName: 'Client', clientPhone: null, seller: 'Vendeur', deliveryLocation: null, deliveryDriver: null, lines: [],
  totals: { subtotal: 0, discount: 0, parcelAmount: 0, deliveryFee: 0, totalAmount: 0, confirmationAmount: 0, remainingAmount: 0 } }
let availableWidth = 351
let resized: () => void
beforeEach(() => {
  availableWidth = 351
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} })
  // jsdom has no layout engine; supply only the browser measurements used by the preview.
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => availableWidth)
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
    return this.dataset.format === 'a4' ? 794 : this.dataset.format === '58mm' ? 219 : 302
  })
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { resized = callback }
    observe() {}
    disconnect() {}
  })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
it('fits the whole A4 preview to mobile width, updates on resize and preserves paper dimensions', () => {
  render(<OrderPrintView document={doc} orderId="order" initialFormat="a4" preferenceKey="fit:a4" />)
  const sheet = document.querySelector('article')!
  const preview = sheet.parentElement!
  expect(Number(preview.style.getPropertyValue('--preview-scale'))).toBeCloseTo(0.442, 3)
  expect(sheet.style.width).toBe('210mm')
  act(() => { availableWidth = 900; resized() })
  expect(Number(preview.style.getPropertyValue('--preview-scale'))).toBe(1)
  act(() => { availableWidth = 351; resized() })
  expect(Number(preview.style.getPropertyValue('--preview-scale'))).toBeCloseTo(0.442, 3)
  fireEvent.change(screen.getByLabelText('Format d’impression'), { target: { value: '58mm' } })
  expect(Number(preview.style.getPropertyValue('--preview-scale'))).toBe(1)
  expect(sheet.style.width).toBe('58mm')
  fireEvent.change(screen.getByLabelText('Format d’impression'), { target: { value: '80mm' } })
  expect(Number(preview.style.getPropertyValue('--preview-scale'))).toBe(1)
  expect(sheet.style.width).toBe('80mm')
})
