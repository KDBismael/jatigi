// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ParcelExport } from '@/components/orders/parcel-export'
import { downloadParcelExport } from '@/lib/parcel-export'

vi.mock('@/lib/parcel-export', () => ({ downloadParcelExport: vi.fn() }))
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks() })

describe('interface d’export des colis', () => {
  it('prépare à la demande puis télécharge et invalide le résultat quand les filtres changent', async () => {
    const report = { delivered: [{ Commande: 'one' }], notDelivered: [] }
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => report })
    vi.stubGlobal('fetch', fetcher)
    render(<ParcelExport />)
    fireEvent.click(screen.getByRole('button', { name: 'Exporter les colis' }))
    expect(fetcher).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Colis à exporter'), { target: { value: 'delivered' } })
    fireEvent.click(screen.getByRole('button', { name: 'Préparer l’export' }))
    await screen.findByText('1 livré(s) · 0 non livré(s)')
    expect(fetcher).toHaveBeenCalledWith('/api/orders/export?status=delivered', { cache: 'no-store' })
    fireEvent.click(screen.getByRole('button', { name: 'Télécharger Excel (.xlsx)' }))
    await waitFor(() => expect(downloadParcelExport).toHaveBeenCalledWith(report, 'xlsx'))
    await waitFor(() => expect(screen.getByLabelText('Colis à exporter').hasAttribute('disabled')).toBe(false))
    fireEvent.change(screen.getByLabelText('Colis à exporter'), { target: { value: 'not_delivered' } })
    expect(screen.queryByRole('button', { name: 'Télécharger Excel (.xlsx)' })).toBeNull()
  })

  it('affiche un échec serveur sans proposer un fichier incomplet', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Export indisponible' }) }))
    render(<ParcelExport />)
    fireEvent.click(screen.getByRole('button', { name: 'Exporter les colis' }))
    fireEvent.click(screen.getByRole('button', { name: 'Préparer l’export' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Export indisponible')
    expect(screen.queryByRole('button', { name: 'Télécharger CSV' })).toBeNull()
  })
})
