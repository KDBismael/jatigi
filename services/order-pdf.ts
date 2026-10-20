import { PDFDocument, rgb, type PDFFont } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { formatDocumentMoney, type DocumentFormat, type OrderDocument } from '@/lib/order-document'

let fontBytes: Promise<Buffer> | undefined
const mm = (value: number) => value * 72 / 25.4

/** Measured line breaking also splits unbroken names, avoiding clipped tickets. */
function wrap(text: string, font: PDFFont, size: number, width: number) {
  const result: string[] = []
  for (const paragraph of text.replace(/[\u0000-\u001f]/g, ' ').split('\n')) {
    let line = ''
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(candidate, size) <= width) { line = candidate; continue }
      if (line) result.push(line)
      line = ''
      for (const char of word) {
        if (line && font.widthOfTextAtSize(line + char, size) > width) { result.push(line); line = '' }
        line += char
      }
    }
    result.push(line)
  }
  return result
}

type Row = { text: string; size: number; center?: boolean; rule?: boolean; gap?: number }
export async function generateOrderPdf(model: OrderDocument, format: DocumentFormat, logoBytes?: Uint8Array | null) {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  fontBytes ??= readFile(path.join(process.cwd(), 'assets/fonts/NotoSans-Regular.ttf'))
  const font = await pdf.embedFont(await fontBytes, { subset: true })
  const thermal = format !== 'a4'
  const width = format === 'a4' ? mm(210) : mm(format === '58mm' ? 58 : 80)
  const margin = mm(thermal ? 4 : 16)
  const size = thermal ? (format === '58mm' ? 8 : 9) : 10
  const contentWidth = width - 2 * margin
  let logo: Awaited<ReturnType<typeof pdf.embedPng>> | undefined
  if (logoBytes) {
    try {
      const grayscale = await sharp(Buffer.from(logoBytes), { limitInputPixels: 16000000 }).grayscale().png().toBuffer()
      logo = await pdf.embedPng(grayscale)
    } catch { /* The document remains printable when a stored logo is damaged. */ }
  }
  const logoSize = logo?.scaleToFit(mm(thermal ? 24 : 36), mm(thermal ? 17 : 22))
  const rows: Row[] = []
  const add = (text: string, options: Partial<Row> = {}) => {
    const rowSize = options.size ?? size
    for (const line of wrap(text, font, rowSize, contentWidth)) rows.push({ text: line, size: rowSize, ...options })
  }
  const rule = () => rows.push({ text: '', size, rule: true })
  add(model.organizationName, { center: true, size: size + 3, gap: 4 })
  add('BON DE COMMANDE', { center: true, gap: 6 })
  add(`N° ${model.reference} - ${model.date}`)
  add(`Vendeur : ${model.seller}`)
  add(`Client : ${model.clientName}`)
  if (model.clientPhone) add(`Téléphone : ${model.clientPhone}`)
  if (model.deliveryLocation) add(`Livraison : ${model.deliveryLocation}`)
  if (model.deliveryDriver) add(`Livreur : ${model.deliveryDriver}`)
  rule()
  for (const line of model.lines) {
    add(line.name, { size: size + 1, gap: 2 })
    if (line.detail) add(line.detail)
    add(`Qté : ${line.quantity} | Prix : ${formatDocumentMoney(line.price)}`)
    if (line.discountReason) {
      add(`Avant remise : ${formatDocumentMoney(line.subtotal)}`)
      add(`Remise : -${formatDocumentMoney(line.discountAmount)}`)
      add(`Motif : ${line.discountReason}`)
    }
    add(`Total ligne : ${formatDocumentMoney(line.total)}`, { gap: 3 })
    rule()
  }
  add(`Sous-total : ${formatDocumentMoney(model.totals.subtotal)}`)
  add(`Remises : -${formatDocumentMoney(model.totals.discount)}`)
  add(`Livraison : ${formatDocumentMoney(model.totals.deliveryFee)}`)
  rule()
  add(`TOTAL : ${formatDocumentMoney(model.totals.totalAmount)}`, { size: size + 2, gap: 4 })
  add(`Dépôt payé : ${formatDocumentMoney(model.totals.confirmationAmount)}`)
  add(`RESTE À PAYER : ${formatDocumentMoney(model.totals.remainingAmount)}`, { size: size + 1, gap: 6 })
  rule()
  add('Merci pour votre confiance.', { center: true })
  add('Document généré par Warko', { center: true, size: size - 1 })
  const rowHeight = (row: Row) => row.rule ? 12 : row.size * 1.5 + (row.gap ?? 0)
  const logoHeight = logoSize ? logoSize.height + 10 : 0
  const totalHeight = rows.reduce((sum, row) => sum + rowHeight(row), 0) + margin * 2 + logoHeight + 8
  // PDF viewers cap page dimensions; exceptionally long rolls continue on another page.
  const pageHeight = thermal ? Math.min(14000, Math.max(mm(70), totalHeight)) : mm(297)
  let page = pdf.addPage([width, pageHeight])
  let y = pageHeight - margin
  if (logo && logoSize) {
    page.drawImage(logo, { x: (width - logoSize.width) / 2, y: y - logoSize.height, ...logoSize })
    y -= logoHeight
  }
  for (const row of rows) {
    if (y - rowHeight(row) < margin) { page = pdf.addPage([width, pageHeight]); y = pageHeight - margin }
    if (row.rule) {
      y -= 6
      page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.4, 0.4, 0.4) })
      y -= 6
    } else {
      y -= row.size * 1.2
      const textWidth = font.widthOfTextAtSize(row.text, row.size)
      page.drawText(row.text, { x: row.center ? (width - textWidth) / 2 : margin, y, font, size: row.size, color: rgb(0, 0, 0) })
      y -= row.size * 0.3 + (row.gap ?? 0)
    }
  }
  pdf.setTitle(`Commande ${model.reference} - ${model.organizationName}`)
  pdf.setLanguage('fr-FR')
  return pdf.save()
}
