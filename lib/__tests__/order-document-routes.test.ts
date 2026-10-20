import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { Order } from '@/types/order'
vi.mock('@/lib/order-context', () => ({ getOrderContext: vi.fn() }))
vi.mock('@/lib/admin-context', () => ({ requireOrganizationAdmin: vi.fn() }))
vi.mock('@/services/order-service', () => ({ getOrderById: vi.fn() }))
vi.mock('@/services/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/services/branding-service', () => ({ getOrganizationBranding: vi.fn(), getOrganizationLogoBytes: vi.fn(), saveOrganizationLogo: vi.fn() }))
vi.mock('@/services/order-pdf', () => ({ generateOrderPdf: vi.fn() }))
import { getOrderContext } from '@/lib/order-context'
import { requireOrganizationAdmin } from '@/lib/admin-context'
import { getOrderById } from '@/services/order-service'
import { createClient } from '@/services/supabase/server'
import { getOrganizationBranding, getOrganizationLogoBytes } from '@/services/branding-service'
import { generateOrderPdf } from '@/services/order-pdf'
import { GET } from '@/app/api/orders/[id]/document/route'
import { PATCH } from '@/app/api/orders/[id]/discounts/route'
import { POST as uploadLogo, DELETE as deleteLogo } from '@/app/api/organization/branding/route'
import { orderForRole } from '@/lib/order-access'

const params = { params: Promise.resolve({ id: 'order-id' }) }
const ctx = { user: { id: 'employee' }, profile: { role: 'employee', organization_id: 'own-org' } }
const order = {
  id: 'order-id', order_date: '2026-10-20', client_name: 'Awa', delivery_fee: 500, confirmation_amount: 100,
  order_lines: [{ id: '11111111-1111-4111-8111-111111111111', quantity: 1, unit_price: 5000, unit_cost: 1234, total_cost: 1234, line_total: 4500, discount_amount: 500, discount_reason: 'Promotion', product: { name: 'Parfum', purchase_cost: 1234 } }],
} as Order
beforeEach(() => vi.resetAllMocks())
function authenticate() { vi.mocked(getOrderContext).mockResolvedValue(ctx as Awaited<ReturnType<typeof getOrderContext>>) }

describe('droits documents, remises et logos', () => {
  it('refuse les documents sans authentification et les formats invalides', async () => {
    vi.mocked(getOrderContext).mockResolvedValue(null)
    expect((await GET(new NextRequest('http://localhost/api/orders/1/document'), params)).status).toBe(401)
    authenticate()
    expect((await GET(new NextRequest('http://localhost/api/orders/1/document?format=unknown'), params)).status).toBe(400)
    expect(getOrderById).not.toHaveBeenCalled()
  })
  it('recherche uniquement la commande de la boutique courante', async () => {
    authenticate(); vi.mocked(getOrderById).mockResolvedValue(null)
    expect((await GET(new NextRequest('http://localhost/api/orders/1/document?organization_id=other'), params)).status).toBe(404)
    expect(getOrderById).toHaveBeenCalledWith('order-id', 'own-org')
  })
  it('retourne un PDF privé et téléchargeable pour les employés', async () => {
    authenticate(); vi.mocked(getOrderById).mockResolvedValue(order)
    vi.mocked(getOrganizationBranding).mockResolvedValue({ name: 'Boutique', logoPath: null, logoUrl: null })
    vi.mocked(getOrganizationLogoBytes).mockResolvedValue(null)
    vi.mocked(generateOrderPdf).mockResolvedValue(new Uint8Array([37, 80, 68, 70]))
    const response = await GET(new NextRequest('http://localhost/api/orders/1/document?format=80mm'), params)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/pdf')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('content-disposition')).toContain('80mm.pdf')
    expect(JSON.stringify(vi.mocked(generateOrderPdf).mock.calls)).not.toContain('1234')
  })
  it('masque les coûts et conserve les remises et prix de vente pour les employés', () => {
    const safe = orderForRole(order, 'employee')
    expect(safe.order_lines?.[0]).toMatchObject({ unit_price: 5000, discount_amount: 500, line_total: 4500 })
    expect(JSON.stringify(safe)).not.toContain('1234')
  })
  it('refuse les remises invalides avant la transaction', async () => {
    authenticate()
    const request = new NextRequest('http://localhost/api/orders/1/discounts', { method: 'PATCH', body: JSON.stringify({ lines: [{ id: order.order_lines![0].id, discount_type: 'amount', discount_value: 10, discount_reason: ' ' }] }) })
    expect((await PATCH(request, params)).status).toBe(400)
    expect(createClient).not.toHaveBeenCalled()
  })
  it('traduit le refus du dépôt et le verrouillage en erreurs compréhensibles', async () => {
    authenticate()
    for (const [message, status] of [['DEPOSIT_EXCEEDS_TOTAL', 400], ['DISCOUNTS_LOCKED', 409]] as const) {
      const rpc = vi.fn().mockResolvedValue({ error: { message } })
      vi.mocked(createClient).mockResolvedValue({ rpc } as unknown as Awaited<ReturnType<typeof createClient>>)
      const response = await PATCH(new NextRequest('http://localhost/api/orders/1/discounts', { method: 'PATCH', body: JSON.stringify({ lines: [{ id: order.order_lines![0].id, discount_type: 'none', discount_value: 0 }] }) }), params)
      expect(response.status).toBe(status)
    }
  })
  it('réserve les imports et suppressions de logos aux administrateurs', async () => {
    vi.mocked(requireOrganizationAdmin).mockResolvedValue(null)
    expect((await uploadLogo(new NextRequest('http://localhost/api/organization/branding', { method: 'POST' }))).status).toBe(403)
    expect((await deleteLogo()).status).toBe(403)
  })
})
