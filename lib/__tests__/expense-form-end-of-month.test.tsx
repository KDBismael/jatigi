// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import ExpensesPage from '@/app/(app)/expenses/page'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function setup(postResponse: Response) {
  const fetch = vi.fn(async (url: string, init?: RequestInit) => init?.method === 'POST' ? postResponse : Response.json([]))
  vi.stubGlobal('fetch', fetch)
  render(<ExpensesPage />)
  fireEvent.change(screen.getByLabelText('Libellé'), { target: { value: 'Formation' } })
  fireEvent.change(screen.getByLabelText('Montant (FCFA)'), { target: { value: '81000' } })
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-31' } })
  return fetch
}
const postedBody = (fetch: ReturnType<typeof vi.fn>) => JSON.parse(fetch.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'POST')![1].body)

it('does not send a day of month for a one-off expense dated the 31st', async () => {
  const fetch = setup(Response.json({ id: 'new' }, { status: 201 }))
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
  await waitFor(() => expect(fetch.mock.calls.some(([, init]) => (init as RequestInit)?.method === 'POST')).toBe(true))
  expect(postedBody(fetch).day_of_month).toBeUndefined()
  expect(screen.queryByText('Impossible d’enregistrer cette dépense.')).toBeNull()
})

it('caps a recurring end-of-month expense at the 28th and says so', async () => {
  const fetch = setup(Response.json({ id: 'new' }, { status: 201 }))
  fireEvent.click(screen.getByLabelText('Récurrente chaque mois'))
  expect(screen.getByText(/le 28 de chaque mois/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
  await waitFor(() => expect(fetch.mock.calls.some(([, init]) => (init as RequestInit)?.method === 'POST')).toBe(true))
  expect(postedBody(fetch).day_of_month).toBe(28)
})

it('shows the server message when saving fails', async () => {
  setup(Response.json({ error: 'Choisissez une personne commerciale valide.' }, { status: 400 }))
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
  expect(await screen.findByText('Choisissez une personne commerciale valide.')).toBeTruthy()
})
