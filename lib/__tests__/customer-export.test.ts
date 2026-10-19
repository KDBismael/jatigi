import { describe, expect, it, vi } from 'vitest'
import { buildCustomerExport, customerExportSchema, normalizeCustomerPhone, customerCsv, downloadCustomerExport } from '@/lib/customer-export'

vi.mock('xlsx', async (importOriginal) => ({
  ...await importOriginal<typeof import('xlsx')>(), writeFile: vi.fn(),
}))

describe('normalisation des téléphones clients', () => {
  it('normalise les numéros ivoiriens et internationaux sans perdre les zéros', () => {
    expect(normalizeCustomerPhone('07 01 02 03 04')).toBe('2250701020304')
    expect(normalizeCustomerPhone('+225 07 01 02 03 04')).toBe('2250701020304')
    expect(normalizeCustomerPhone('00225 07 01 02 03 04')).toBe('2250701020304')
    expect(normalizeCustomerPhone('+33 6 12 34 56 78')).toBe('33612345678')
  })
  it('écarte les numéros absents, ambigus ou invalides', () => {
    for (const phone of [null, '', '123', 'abcdefghij', '0701020304 poste 2', '1234567890', '+225070102030', '+0000000000']) {
      expect(normalizeCustomerPhone(phone)).toBeNull()
    }
  })
})

describe('liste clients exportable', () => {
  it('déduplique les commandes par téléphone et compte les exclusions', () => {
    const report = buildCustomerExport([
      { id: 'recent', client_name: 'Awa', client_phone: '+2250701020304', order_date: '2026-10-18', order_lines: [{ product_id: 'p1', product: { name: 'Parfum' } }] },
      { id: 'old', client_name: 'Awa ancien', client_phone: '07 01 02 03 04', order_date: '2026-10-01', order_lines: [{ product_id: 'p2', product: { name: 'Crème' } }, { product_id: 'p1', product: { name: 'Parfum' } }] },
      { id: 'missing', client_name: 'Sans numéro', client_phone: null, order_date: '2026-10-19', order_lines: [] },
    ])
    expect(report).toEqual({ matchedOrders: 3, excludedOrders: 1, duplicateOrders: 1, customers: [{
      name: 'Awa', phone: '2250701020304', orderCount: 2, firstOrderDate: '2026-10-01', lastOrderDate: '2026-10-18', products: ['Crème', 'Parfum'],
    }] })
    expect(customerCsv(report.customers)).toBe('phone\r\n2250701020304\r\n')
  })
  it('gère une liste vide', () => {
    expect(buildCustomerExport([]).customers).toEqual([])
    expect(customerCsv([])).toBe('phone\r\n')
  })
  it('écrit les téléphones comme du texte dans Excel et ne transforme pas les noms en formules', async () => {
    const XLSX = await import('xlsx')
    const writer = vi.mocked(XLSX.writeFile)
    try {
      const report = buildCustomerExport([{ id: '1', client_name: '=1+1', client_phone: '0701020304', order_date: '2026-10-19', order_lines: [] }])
      await downloadCustomerExport(report, 'xlsx')
      const workbook = writer.mock.calls[0][0]
      expect(workbook.Sheets.Clients.A2).toMatchObject({ t: 's', v: '=1+1' })
      expect(workbook.Sheets.Clients.A2.f).toBeUndefined()
      expect(workbook.Sheets.Clients.B2).toMatchObject({ t: 's', v: '2250701020304' })
    } finally { writer.mockReset() }
  })
})

describe('filtres export clients', () => {
  it('utilise les livrées et tout historique par défaut', () => {
    expect(customerExportSchema.parse({})).toEqual({ status: 'delivered' })
  })
  it('valide les dates, leur ordre, les statuts et le produit', () => {
    for (const filters of [{ from: '2026-02-30' }, { from: '2026-10-19', to: '2026-10-01' }, { status: 'oops' }, { productId: 'oops' }]) {
      expect(customerExportSchema.safeParse(filters).success).toBe(false)
    }
    expect(customerExportSchema.safeParse({ status: 'all', from: '2026-10-01' }).success).toBe(true)
  })
})
