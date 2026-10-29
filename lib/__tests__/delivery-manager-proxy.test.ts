import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn() }))
import { createServerClient } from '@supabase/ssr'
import { proxy } from '@/proxy'
let role = 'manager'
beforeEach(() => {
 vi.mocked(createServerClient).mockReturnValue({ auth: { getUser: async () => ({ data: { user: { id: 'user' } } }) }, from: (table: string) => ({ select() { return this }, eq() { return this }, maybeSingle: async () => ({ data: table === 'platform_admins' ? null : { role } }), single: async () => ({ data: { role } }) }) } as unknown as ReturnType<typeof createServerClient>)
})
it.each(['/deliveries', '/deliveries/details'])('allows manager into %s', async (path) => {
 role = 'manager'; expect((await proxy(new NextRequest(`http://localhost${path}`))).headers.get('location')).toBe(null)
})
it.each(['/dashboard', '/products', '/analytics', '/team', '/expenses', '/pilotage', '/reports'])('blocks manager from %s', async (path) => {
 role = 'manager'; expect((await proxy(new NextRequest(`http://localhost${path}`))).headers.get('location')).toBe('http://localhost/orders')
})
it('blocks employee delivery access', async () => {
 role = 'employee'; expect((await proxy(new NextRequest('http://localhost/deliveries'))).headers.get('location')).toBe('http://localhost/orders')
})
it('keeps admin delivery access', async () => {
 role = 'admin'; expect((await proxy(new NextRequest('http://localhost/deliveries'))).headers.get('location')).toBe(null)
})
