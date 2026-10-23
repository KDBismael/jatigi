// @vitest-environment jsdom
import React, { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PrinterPicker } from '@/components/orders/printer-picker'
import { findDesktopPrinters, printBluetoothReceipt, printDesktopPdf, prepareAndroidReceipt } from '@/lib/printer-transport'
import { connectBluetoothPrinter } from '@/lib/bluetooth-printer'
import type { PrinterSettings } from '@/lib/printer-settings'
vi.mock('@/lib/printer-transport', () => ({ findDesktopPrinters: vi.fn(), printDesktopPdf: vi.fn(), prepareAndroidReceipt: vi.fn(), printBluetoothReceipt: vi.fn() }))
vi.mock('@/lib/bluetooth-printer', async importOriginal => ({ ...await importOriginal<object>(), connectBluetoothPrinter: vi.fn() }))
const systemPrint = vi.fn()
function Example() {
  const [settings, setSettings] = useState<PrinterSettings>({ method: 'system', format: 'a4', printer: '' })
  return <PrinterPicker orderId="saved-order" settings={settings} onSettingsChange={setSettings} onSystemPrint={systemPrint} getElement={() => document.createElement('article')} onClose={() => {}} />
}
beforeEach(() => {
  const stored = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => stored.set(key, value) })
})
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
  it('connecte d’abord l’imprimante sans imprimer, puis imprime en un appui', async () => {
    vi.stubGlobal('navigator', { userAgent: 'Android', serial: {}, bluetooth: {} })
    vi.mocked(connectBluetoothPrinter).mockResolvedValue({ route: 'ble', name: 'YHD-8390_BLE' })
    vi.mocked(printBluetoothReceipt).mockResolvedValue('YHD-8390_BLE')
    render(<Example />)
    fireEvent.click(screen.getByLabelText(/Bluetooth · imprimante ticket/))
    expect((screen.getByLabelText('Format d’impression') as HTMLSelectElement).value).toBe('58mm')
    expect(screen.queryByRole('option', { name: 'A4' })).toBeNull()
    expect(screen.getByText('Aucune imprimante connectée')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Connecter l’imprimante' }))
    await screen.findByText(/YHD-8390_BLE est connectée/)
    expect(connectBluetoothPrinter).toHaveBeenCalledWith('ble')
    expect(printBluetoothReceipt).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Imprimer maintenant' }))
    await screen.findByText(/Ticket envoyé à YHD-8390_BLE/)
    expect(printBluetoothReceipt).toHaveBeenCalledWith(expect.any(Function), '58mm', expect.objectContaining({ onProgress: expect.any(Function) }))
    expect(prepareAndroidReceipt).not.toHaveBeenCalled()
  })
  it('affiche l’imprimante mémorisée, permet d’en changer et propose les imprimantes associées en secours', async () => {
    vi.stubGlobal('navigator', { userAgent: 'Android', serial: {}, bluetooth: {} })
    localStorage.setItem('warko:bluetooth-printer', JSON.stringify({ route: 'ble', name: 'YHD-8390_BLE' }))
    vi.mocked(connectBluetoothPrinter).mockResolvedValue({ route: 'serial', name: 'Imprimante Bluetooth' })
    render(<Example />)
    fireEvent.click(screen.getByLabelText(/Bluetooth · imprimante ticket/))
    expect(screen.getByText('YHD-8390_BLE')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Imprimer maintenant' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Changer' }))
    await waitFor(() => expect(connectBluetoothPrinter).toHaveBeenLastCalledWith('ble'))
    fireEvent.click(screen.getByText('Votre imprimante n’apparaît pas ?'))
    fireEvent.click(screen.getByRole('button', { name: 'Choisir une imprimante associée' }))
    await waitFor(() => expect(connectBluetoothPrinter).toHaveBeenLastCalledWith('serial'))
  })
  it('affiche un message clair si l’utilisateur ferme la liste Bluetooth', async () => {
    vi.stubGlobal('navigator', { userAgent: 'Android', bluetooth: {} })
    vi.mocked(connectBluetoothPrinter).mockRejectedValue(new DOMException('cancel', 'NotFoundError'))
    render(<Example />)
    fireEvent.click(screen.getByLabelText(/Bluetooth · imprimante ticket/))
    fireEvent.click(screen.getByRole('button', { name: 'Connecter l’imprimante' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/Aucune imprimante choisie/)
  })
  it('désactive le Bluetooth direct hors Chrome Android et oriente vers AirPrint', () => {
    vi.stubGlobal('navigator', { userAgent: 'iPhone' })
    render(<Example />)
    fireEvent.click(screen.getByLabelText(/Bluetooth · imprimante ticket/))
    expect(screen.getByText(/nécessite Chrome sur Android/)).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Imprimer maintenant' }) as HTMLButtonElement).disabled).toBe(true)
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
