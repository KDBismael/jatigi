// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { OrganizationLogo } from '@/components/account/organization-logo'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ logoUrl: null })))
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('shows a visible French picker button and keeps saving disabled without a file', async () => {
  render(<OrganizationLogo />)
  await waitFor(() => expect(fetch).toHaveBeenCalled())
  expect(screen.getByText('Choisir une image')).toBeTruthy()
  expect(screen.getByLabelText('Choisir une image')).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Enregistrer le logo' }) as HTMLButtonElement).disabled).toBe(true)
})

it('previews the chosen file with its name before saving it', async () => {
  render(<OrganizationLogo />)
  const file = new File(['png'], 'boutique.png', { type: 'image/png' })
  fireEvent.change(screen.getByLabelText('Choisir une image'), { target: { files: [file] } })
  expect(screen.getByText('boutique.png')).toBeTruthy()
  expect(screen.getByText('Changer d’image')).toBeTruthy()
  expect(screen.getByAltText('Aperçu du nouveau logo').getAttribute('src')).toBe('blob:preview')
  const save = screen.getByRole('button', { name: 'Enregistrer le logo' }) as HTMLButtonElement
  expect(save.disabled).toBe(false)
  vi.mocked(fetch).mockResolvedValueOnce(Response.json({ logoUrl: 'https://cdn.test/logo.png' }))
  fireEvent.click(save)
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Logo enregistré'))
  const [, init] = vi.mocked(fetch).mock.calls.at(-1)!
  expect((init!.body as FormData).get('logo')).toBe(file)
  expect(screen.queryByText('boutique.png')).toBeNull()
})
