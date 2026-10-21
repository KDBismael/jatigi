import { describe, expect, it } from 'vitest'
import { buildParcelExport, parcelCsv, parcelExportSchema, parcelWorkbook, type ParcelExportOrder } from '@/lib/parcel-export'

const order: ParcelExportOrder = {
  id: 'order-1', order_date: '2026-10-21', client_name: 'Awa', client_phone: '0701020304',
  channel: 'facebook', status: 'delivered', delivery_location: 'Cocody', delivery_fee: 500,
  confirmation_amount: 1000, delivery_driver: { name: 'Ali' },
  order_lines: [{ quantity: 3, unit_price: 5000, line_total: 14000, discount_amount: 1000, product: { name: 'Parfum' } }],
}

describe('export des colis compatible Google Sheets', () => {
  it('conserve chaque colis, y compris sans téléphone, et utilise les montants nets historiques', () => {
    const report = buildParcelExport([order, { ...order, id: 'order-2', client_phone: null, status: 'cancelled' }])
    expect(report.delivered).toHaveLength(1)
    expect(report.notDelivered).toHaveLength(1)
    expect(report.delivered[0]).toMatchObject({ Commande: 'order-1', Téléphone: '0701020304', Produits: 'Parfum × 3',
      'Total (FCFA)': 14500, 'Remises (FCFA)': 1000, 'Dépôt (FCFA)': 1000, 'Reste à payer (FCFA)': 13500 })
    expect(report.notDelivered[0]).toMatchObject({ Téléphone: '', Statut: 'Annulée' })
    expect(JSON.stringify(report)).not.toMatch(/cost|coût|purchase/i)
  })

  it('produit deux onglets avec les téléphones en texte et les en-têtes même à vide', async () => {
    const { utils } = await import('xlsx')
    const workbook = await parcelWorkbook(buildParcelExport([order]))
    expect(workbook.SheetNames).toEqual(['Livrés', 'Non livrés'])
    const sheet = workbook.Sheets['Livrés']
    const headers = utils.sheet_to_json<string[]>(sheet, { header: 1 })[0]
    const phone = sheet[utils.encode_cell({ r: 1, c: headers.indexOf('Téléphone') })]
    expect(phone).toMatchObject({ t: 's', v: '0701020304' })
    expect(utils.sheet_to_json(workbook.Sheets['Non livrés'], { header: 1 })).toEqual([headers])
  })

  it('échappe les cellules CSV et neutralise les formules saisies dans les noms', () => {
    const report = buildParcelExport([{ ...order, client_name: '=1+1', delivery_location: 'Rue "A",\nAbidjan' }])
    const csv = parcelCsv(report)
    expect(csv).toContain("'=1+1")
    expect(csv).toContain('"Rue ""A"",\nAbidjan"')
    expect(csv).toContain('0701020304')
  })

  it('valide le statut et les dates calendaires et refuse les périodes inversées', () => {
    expect(parcelExportSchema.parse({})).toEqual({ status: 'all' })
    for (const filters of [{ status: 'other' }, { from: '2026-02-30' }, { from: '2026-10-21', to: '2026-10-01' }]) {
      expect(parcelExportSchema.safeParse(filters).success).toBe(false)
    }
  })
})
