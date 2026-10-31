import { expect, it } from 'vitest'
import { responseError } from '@/lib/response-error'

it('uses the API sentence and falls back for objects or non-JSON bodies', async () => {
  expect((await responseError(Response.json({ error: 'Email déjà utilisé' }, { status: 400 }), 'Échec')).message).toBe('Email déjà utilisé')
  expect((await responseError(Response.json({ error: { fieldErrors: {} } }, { status: 400 }), 'Échec')).message).toBe('Échec')
  expect((await responseError(new Response('<html>502</html>', { status: 502 }), 'Échec')).message).toBe('Échec')
})
