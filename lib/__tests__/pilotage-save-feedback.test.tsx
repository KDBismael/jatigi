// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
vi.mock('@/hooks/use-order-options', () => ({ useOrderOptions: () => ({ sellers: [] }) }))
import PilotagePage from '@/app/(app)/pilotage/page'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('tells the user when a monthly goal is refused instead of failing silently', async () => {
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) =>
    init?.method === 'POST' ? Response.json({ error: 'Choisissez le premier jour du mois.' }, { status: 400 }) : Response.json([])))
  render(<PilotagePage />)
  fireEvent.click(screen.getAllByRole('button', { name: 'Enregistrer' })[0])
  expect((await screen.findByRole('alert')).textContent).toBe('Choisissez le premier jour du mois.')
})

it('confirms a saved monthly goal', async () => {
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) =>
    init?.method === 'POST' ? Response.json({ id: 'g' }, { status: 201 }) : Response.json([])))
  render(<PilotagePage />)
  fireEvent.click(screen.getAllByRole('button', { name: 'Enregistrer' })[0])
  expect((await screen.findByRole('status')).textContent).toBe('Objectif enregistré.')
})
