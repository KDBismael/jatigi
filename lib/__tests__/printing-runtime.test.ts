import { describe, expect, it, vi } from 'vitest'
vi.mock('sharp', () => { throw new Error('libvips-cpp.so: cannot open shared object file') })
vi.mock('@/services/supabase/server', () => ({
  createAdminClient: async () => ({ from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { name: 'Boutique', logo_path: null }, error: null }) }) }) }) }),
}))

describe('impression sans dépendance native au chargement', () => {
  it('charge les informations de boutique même si le module image est indisponible', async () => {
    const service = await import('@/services/branding-service')
    await expect(service.getOrganizationBranding('own-org')).resolves.toMatchObject({ name: 'Boutique', logoUrl: null })
  })
  it('génère un PDF sans logo même si le module image est indisponible', async () => {
    const { generateOrderPdf } = await import('@/services/order-pdf')
    const pdf = await generateOrderPdf({ reference: '12345678', date: '21/10/2026', organizationName: 'Boutique', logoUrl: null,
      clientName: 'Client', clientPhone: null, seller: 'Vendeur', deliveryLocation: null, deliveryDriver: null, lines: [],
      totals: { subtotal: 0, discount: 0, parcelAmount: 0, deliveryFee: 0, totalAmount: 0, confirmationAmount: 0, remainingAmount: 0 } }, 'a4')
    expect(new TextDecoder().decode(pdf.slice(0, 4))).toBe('%PDF')
  })
})
