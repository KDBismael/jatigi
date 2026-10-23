import { z } from 'zod'
import { documentFormatSchema } from '@/lib/order-document'

const schema = z.object({ method: z.enum(['system', 'bluetooth', 'rawbt', 'qz']), format: documentFormatSchema, printer: z.string().max(256) })
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
  const packed = new Uint8Array(rowBytes * height)
  const inked = new Array<boolean>(height).fill(false)
  for (let row = 0; row < height; row++) {
    for (let x = 0; x < width; x++) {
      const i = (row * width + x) * 4
      const alpha = data[i + 3] / 255
      const brightness = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) * alpha + 255 * (1 - alpha)
      if (brightness < 180) { packed[row * rowBytes + (x >> 3)] |= 128 >> (x % 8); inked[row] = true }
    }
  }
  // A receipt is mostly white: feeding blank rows (ESC J, 3 bytes) instead of sending them as raster
  // shrinks the job several times, which matters over slow 20-byte Bluetooth packets.
  const parts: number[][] = [[27, 64]]
  let size = 2
  for (let y = 0; y < height;) {
    const start = y
    if (!inked[y]) {
      while (y < height && !inked[y] && y - start < 255) y++
      parts.push([27, 74, y - start]); size += 3
      continue
    }
    while (y < height && inked[y] && y - start < 128) y++
    const header = [29, 118, 48, 0, rowBytes & 255, rowBytes >> 8, y - start, 0]
    parts.push(header, Array.from(packed.subarray(start * rowBytes, y * rowBytes))); size += header.length + (y - start) * rowBytes
  }
  parts.push([10, 10, 10, 29, 86, 0]); size += 6
  const bytes = new Uint8Array(size)
  let cursor = 0
  for (const part of parts) { bytes.set(part, cursor); cursor += part.length }
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
