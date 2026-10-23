import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parsePrinterSettings, rasterToEscPos, rawBtIntent } from '@/lib/printer-settings'
import { findDesktopPrinters, printBluetoothReceipt, printDesktopPdf, prepareAndroidReceipt } from '@/lib/printer-transport'
const renderImage = vi.hoisted(() => ({ toCanvas: vi.fn() }))
vi.mock('html-to-image', () => renderImage)
const qz = vi.hoisted(() => ({
  websocket: { isActive: vi.fn(), connect: vi.fn() }, printers: { find: vi.fn() },
  configs: { create: vi.fn() }, print: vi.fn(),
}))
vi.mock('qz-tray', () => ({ default: qz }))
const bluetooth = vi.hoisted(() => ({ openBluetoothPrinter: vi.fn() }))
vi.mock('@/lib/bluetooth-printer', () => bluetooth)
describe('impression Bluetooth directe', () => {
  it('se connecte avant le rendu pour garder le geste utilisateur, puis ferme la connexion même en cas d’échec', async () => {
    const order: string[] = []
    const printer = { name: 'YHD-8390', send: vi.fn(async () => { order.push('send') }), close: vi.fn(async () => { order.push('close') }) }
    bluetooth.openBluetoothPrinter.mockImplementation(async () => { order.push('open'); return printer })
    vi.stubGlobal('document', { fonts: { ready: Promise.resolve() } })
    const image = { width: 8, height: 1, data: new Uint8ClampedArray(32).fill(255) }
    renderImage.toCanvas.mockImplementation(async () => { order.push('render'); return { width: 8, height: 1, getContext: () => ({ getImageData: () => image }) } })
    const element = { getBoundingClientRect: () => ({ width: 219, height: 400 }), querySelectorAll: () => [] } as unknown as HTMLElement
    expect(await printBluetoothReceipt(() => element, '58mm', { route: 'serial' })).toBe('YHD-8390')
    expect(order).toEqual(['open', 'render', 'send', 'close'])
    expect(bluetooth.openBluetoothPrinter).toHaveBeenCalledWith('serial')
    printer.send.mockRejectedValueOnce(new Error('coupure'))
    await expect(printBluetoothReceipt(() => element, '58mm')).rejects.toThrow('coupure')
    expect(printer.close).toHaveBeenCalledTimes(2)
    vi.unstubAllGlobals()
  })
})
describe('préférences et ticket Android', () => {
  it('valide les préférences stockées et revient au système pour les données invalides', () => {
    expect(parsePrinterSettings('{broken')).toEqual({ method: 'system', format: 'a4', printer: '' })
    expect(parsePrinterSettings(JSON.stringify({ method: 'rawbt', format: '58mm', printer: '' })).method).toBe('rawbt')
    expect(parsePrinterSettings(JSON.stringify({ method: 'javascript:alert(1)', format: 'a4' })).method).toBe('system')
  })
  it('convertit une image noir/blanc en ESC/POS et complète les octets de largeur incomplète', () => {
    const data = new Uint8ClampedArray([0,0,0,255, 255,255,255,255, 0,0,0,255])
    const bytes = rasterToEscPos({ width: 3, height: 1, data })
    expect([...bytes.slice(0, 10)]).toEqual([27,64,29,118,48,0,1,0,1,0])
    expect(bytes[10]).toBe(0b10100000)
  })
  it('découpe les tickets longs et refuse les dimensions trop grandes au lieu de tronquer', () => {
    const bytes = rasterToEscPos({ width: 8, height: 129, data: new Uint8ClampedArray(8 * 129 * 4).fill(255) })
    expect([...bytes.slice(138, 146)]).toEqual([29,118,48,0,1,0,1,0])
    expect(() => rasterToEscPos({ width: 576, height: 20000, data: new Uint8ClampedArray() })).toThrow(/long/)
  })
  it('construit une intention Android limitée au paquet RawBT et aux octets du ticket', () => {
    const uri = rawBtIntent(new Uint8Array([27,64,10]))
    expect(uri).toContain('intent:base64,G0AK#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;')
    expect(uri).toContain('browser_fallback_url=')
    expect(() => rawBtIntent(new Uint8Array(250_000))).toThrow(/long/)
  })
  it('retire la marge auto du reçu HTML pour ne pas décaler ni couper le ticket raster', async () => {
    vi.stubGlobal('document', { fonts: { ready: Promise.resolve() } })
    const image = { width: 8, height: 1, data: new Uint8ClampedArray(32).fill(255) }
    renderImage.toCanvas.mockResolvedValue({ width: 8, height: 1, getContext: () => ({ getImageData: () => image }) })
    const element = { getBoundingClientRect: () => ({ width: 219, height: 400 }), querySelectorAll: () => [] } as unknown as HTMLElement
    await prepareAndroidReceipt(element, '58mm')
    expect(renderImage.toCanvas).toHaveBeenCalledWith(element, expect.objectContaining({ style: { margin: '0', boxShadow: 'none', transform: 'none' } }))
    vi.unstubAllGlobals()
  })
})
describe('impression desktop QZ Tray', () => {
  beforeEach(() => { vi.resetAllMocks(); vi.unstubAllGlobals() })
  it('liste les imprimantes après connexion au helper', async () => {
    qz.printers.find.mockResolvedValue(['YHD-8390', 'Bureau A4'])
    expect(await findDesktopPrinters()).toEqual(['YHD-8390', 'Bureau A4'])
    expect(qz.websocket.connect).toHaveBeenCalledTimes(1)
  })
  it('charge le PDF authentifié dans le navigateur avant de le transmettre au helper', async () => {
    qz.websocket.isActive.mockReturnValue(true)
    qz.configs.create.mockReturnValue('config')
    const fetcher = vi.fn().mockResolvedValue(new Response(new Uint8Array([37,80,68,70]), { headers: { 'content-type': 'application/pdf' } }))
    vi.stubGlobal('fetch', fetcher)
    await printDesktopPdf('order', '80mm', 'YHD-8390')
    expect(fetcher).toHaveBeenCalledWith('/api/orders/order/document?format=80mm', { cache: 'no-store', credentials: 'same-origin' })
    expect(qz.print).toHaveBeenCalledWith('config', [{ type: 'pixel', format: 'pdf', flavor: 'base64', data: 'JVBERg==' }])
  })
  it('ne transmet rien après un refus d’accès ou une réponse HTML de connexion', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('login', { status: 200, headers: { 'content-type': 'text/html' } })))
    await expect(printDesktopPdf('other-order', 'a4', 'Printer')).rejects.toThrow(/document/)
    expect(qz.print).not.toHaveBeenCalled()
  })
})
