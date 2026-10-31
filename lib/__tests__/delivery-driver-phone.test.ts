import { expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { deliveryDriverSchema } from '@/lib/schemas/delivery-driver.schema'
vi.mock('@/services/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) }, from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'admin', organization_id: 'shop' } }) }) }) }) }) }))
vi.mock('@/services/delivery-driver-service', () => ({ createDeliveryDriver: vi.fn(), getDeliveryDrivers: vi.fn() }))
import { POST } from '@/app/api/delivery-drivers/route'
it.each(['abc','1234567','1234567890123456','+225 07abc0000000'])('refuse le téléphone invalide %s', phone => {
 expect(deliveryDriverSchema.safeParse({ name: 'Koffi', phone }).success).toBe(false)
})
it.each(['',undefined,'07 00 00 00 00','+225 (07) 00-00-00-00','12345678','123456789012345'])('préserve le téléphone facultatif valide %s', phone => {
 expect(deliveryDriverSchema.parse({ name: 'Koffi', phone }).phone).toBe(phone)
})
it('renvoie une erreur française lisible au client API pour un téléphone invalide', async () => {
 const response = await POST(new NextRequest('http://localhost/api/delivery-drivers', { method: 'POST', body: JSON.stringify({ name: 'Koffi', phone: 'abc' }) }))
 expect(response.status).toBe(400)
 const body = await response.json()
 expect(body.error).toEqual(expect.stringMatching(/numéro de téléphone valide/i))
})
