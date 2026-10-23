import type { DocumentFormat } from '@/lib/order-document'
import { bytesToBase64, rasterToEscPos, rawBtIntent } from '@/lib/printer-settings'
import { openBluetoothPrinter, type BluetoothRoute } from '@/lib/bluetooth-printer'

async function desktop() {
  const { default: qz } = await import('qz-tray')
  if (!qz.websocket.isActive()) await qz.websocket.connect({ retries: 0 })
  return qz
}
export async function findDesktopPrinters(): Promise<string[]> {
  const qz = await desktop()
  const printers = await qz.printers.find()
  return typeof printers === 'string' ? [printers] : printers
}
export async function printDesktopPdf(orderId: string, format: DocumentFormat, printer: string) {
  if (!printer.trim()) throw new Error('Choisissez une imprimante.')
  // The local helper has no authenticated browser session: fetch privately here.
  const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/document?format=${format}`, { cache: 'no-store', credentials: 'same-origin' })
  if (!response.ok || !response.headers.get('content-type')?.includes('application/pdf')) throw new Error('Impossible de charger le document. Vérifiez votre connexion et réessayez.')
  const data = bytesToBase64(new Uint8Array(await response.arrayBuffer()))
  const qz = await desktop()
  const config = qz.configs.create(printer, { jobName: `Warko ${orderId.slice(0, 8)}`, scaleContent: false })
  await qz.print(config, [{ type: 'pixel', format: 'pdf', flavor: 'base64', data }])
}

export async function prepareAndroidReceipt(element: HTMLElement, format: '58mm' | '80mm') {
  return rawBtIntent(await renderReceiptBytes(element, format))
}

/** Connects first (the chooser needs the tap's user activation), then renders and streams the ticket. */
export async function printBluetoothReceipt(getElement: () => HTMLElement | null, format: '58mm' | '80mm',
  { route, onProgress }: { route?: BluetoothRoute; onProgress?: (ratio: number) => void } = {}) {
  const printer = await openBluetoothPrinter(route)
  try {
    const element = getElement()
    if (!element) throw new Error('Le reçu n’est pas encore prêt. Réessayez.')
    await printer.send(await renderReceiptBytes(element, format), onProgress)
    return printer.name
  } finally { await printer.close() }
}

async function renderReceiptBytes(element: HTMLElement, format: '58mm' | '80mm') {
  await document.fonts.ready
  await Promise.all(Array.from(element.querySelectorAll('img')).map(img => img.decode()))
  const width = format === '58mm' ? 384 : 576
  const bounds = element.getBoundingClientRect()
  const height = Math.ceil(bounds.height * width / bounds.width)
  if (!Number.isFinite(height) || height < 1 || width * height > 8_000_000) throw new Error('Ticket trop long pour Bluetooth. Utilisez le PDF.')
  const { toCanvas } = await import('html-to-image')
  const canvas = await toCanvas(element, { backgroundColor: '#ffffff', canvasWidth: width, canvasHeight: height, pixelRatio: 1, skipAutoScale: true,
    style: { margin: '0', boxShadow: 'none', transform: 'none' } })
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Votre navigateur ne peut pas préparer le ticket. Utilisez l’impression système.')
  return rasterToEscPos(context.getImageData(0, 0, canvas.width, canvas.height))
}
