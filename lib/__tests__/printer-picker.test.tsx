// @vitest-environment jsdom
import React, { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PrinterPicker } from '@/components/orders/printer-picker'
import { findDesktopPrinters, printDesktopPdf, prepareAndroidReceipt } from '@/lib/printer-transport'
import type { PrinterSettings } from '@/lib/printer-settings'
vi.mock('@/lib/printer-transport', () => ({ findDesktopPrinters: vi.fn(), printDesktopPdf: vi.fn(), prepareAndroidReceipt: vi.fn() }))
const systemPrint = vi.fn()
function Example() {
  const [settings, setSettings] = useState<PrinterSettings>({ method: 'system', format: 'a4', printer: '' })
  return <PrinterPicker orderId="saved-order" settings={settings} onSettingsChange={setSettings} onSystemPrint={systemPrint} getElement={() => document.createElement('article')} onClose={() => {}} />
}
afterEach(() => { cleanup(); vi.resetAllMocks(); vi.unstubAllGlobals() })
describe('sélecteur d’imprimante pour tous les utilisateurs des commandes', () => {
  it('propose l’impression système sans télécharger de PDF', async () => {
    render(<Example />)
    fireEvent.click(screen.getByRole('button', { name: 'Imprimer maintenant' }))
    await waitFor(() => expect(systemPrint).toHaveBeenCalledTimes(1))
    expect(printDesktopPdf).not.toHaveBeenCalled()
  })
  it('liste les vraies imprimantes desktop et permet de réessayer après un échec sans recréer de commande', async () => {
    vi.mocked(findDesktopPrinters).mockResolvedValue(['YHD-8390', 'Bureau'])
    vi.mocked(printDesktopPdf).mockRejectedValueOnce(new Error('Imprimante hors ligne')).mockResolvedValueOnce(undefined)
    render(<Example />)
    fireEvent.click(screen.getByLabelText(/Ordinateur/))
    fireEvent.click(screen.getByRole('button', { name: 'Rechercher les imprimantes' }))
    await screen.findByRole('option', { name: 'YHD-8390' })
    fireEvent.change(screen.getByLabelText('Imprimante'), { target: { value: 'YHD-8390' } })
    fireEvent.click(screen.getByRole('button', { name: 'Imprimer maintenant' }))
    await screen.findByText('Imprimante hors ligne')
    fireEvent.click(screen.getByRole('button', { name: 'Imprimer maintenant' }))
    await screen.findByText(/Envoyé à l’imprimante/)
    expect(printDesktopPdf).toHaveBeenCalledTimes(2)
    expect(printDesktopPdf).toHaveBeenCalledWith('saved-order', 'a4', 'YHD-8390')
  })
  it('prépare un ticket Android puis demande un clic explicite pour ouvrir le helper', async () => {
    vi.stubGlobal('navigator', { userAgent: 'Android' })
    vi.mocked(prepareAndroidReceipt).mockResolvedValue('intent:base64,G0A=#Intent;scheme=rawbt;end;')
    render(<Example />)
    fireEvent.click(screen.getByLabelText(/Android/))
    expect((screen.getByLabelText('Format d’impression') as HTMLSelectElement).value).toBe('58mm')
    fireEvent.click(screen.getByRole('button', { name: 'Préparer le ticket Bluetooth' }))
    const link = await screen.findByRole('link', { name: 'Envoyer à RawBT' })
    expect(link.getAttribute('href')).toContain('intent:base64,')
    fireEvent.change(screen.getByLabelText('Format d’impression'), { target: { value: '80mm' } })
    expect(screen.queryByRole('link', { name: 'Envoyer à RawBT' })).toBeNull()
  })
})
