import { z } from 'zod'
import { documentFormatSchema } from '@/lib/order-document'

const schema = z.object({ method: z.enum(['system', 'rawbt', 'qz']), format: documentFormatSchema, printer: z.string().max(256) })
export type PrinterSettings = z.infer<typeof schema>
export const defaultPrinterSettings: PrinterSettings = { method: 'system', format: 'a4', printer: '' }
export function parsePrinterSettings(raw: string | null): PrinterSettings {
  try { return schema.parse(JSON.parse(raw ?? 'null')) }
  catch { return defaultPrinterSettings }
}

/** Raster graphics avoid dependence on a printer's text encoding for French or logos. */
export function rasterToEscPos(image: { width: number; height: number; data: Uint8ClampedArray }): Uint8Array {
  const { width, height, data } = image
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 576 || width * height > 8_000_000) {
    throw new Error('Ticket trop long pour Bluetooth. Utilisez l’impression système ou le PDF.')
  }
  if (data.length !== width * height * 4) throw new Error('Image du ticket invalide.')
  const rowBytes = Math.ceil(width / 8)
  const bytes = new Uint8Array(2 + rowBytes * height + Math.ceil(height / 128) * 8 + 6)
  let cursor = 0
  bytes.set([27, 64], cursor); cursor += 2
  for (let y = 0; y < height; y += 128) {
    const rows = Math.min(128, height - y)
    bytes.set([29, 118, 48, 0, rowBytes & 255, rowBytes >> 8, rows, 0], cursor); cursor += 8
    for (let row = y; row < y + rows; row++) {
      for (let x = 0; x < width; x++) {
        const i = (row * width + x) * 4
        const alpha = data[i + 3] / 255
        const brightness = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) * alpha + 255 * (1 - alpha)
        if (brightness < 180) bytes[cursor + (x >> 3)] |= 128 >> (x % 8)
      }
      cursor += rowBytes
    }
  }
  bytes.set([10, 10, 10, 29, 86, 0], cursor)
  return bytes
}

export function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
  return btoa(binary)
}
export function rawBtIntent(bytes: Uint8Array): string {
  const encoded = bytesToBase64(bytes)
  // Intent strings are marshalled through Android's shared, bounded Binder buffer.
  if (encoded.length > 300_000) throw new Error('Ticket trop long pour Bluetooth. Utilisez l’impression système ou le PDF.')
  const fallback = encodeURIComponent('https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter')
  return `intent:base64,${encoded}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;S.browser_fallback_url=${fallback};end;`
}
