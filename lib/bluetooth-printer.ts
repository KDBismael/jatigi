// Web Serial (Bluetooth Classic SPP) and Web Bluetooth (BLE) are Chromium-only and absent from TypeScript's DOM lib.
interface SerialPortLike {
  getInfo(): { bluetoothServiceClassId?: string | number }
  open(options: { baudRate: number }): Promise<void>
  close(): Promise<void>
  forget?(): Promise<void>
  writable: WritableStream<Uint8Array> | null
}
interface SerialLike { getPorts(): Promise<SerialPortLike[]>; requestPort(options: object): Promise<SerialPortLike> }
interface CharacteristicLike {
  uuid: string
  properties: { write: boolean; writeWithoutResponse: boolean }
  writeValueWithResponse(value: BufferSource): Promise<void>
  writeValueWithoutResponse(value: BufferSource): Promise<void>
}
interface GattLike {
  connect(): Promise<GattLike>
  disconnect(): void
  getPrimaryService(uuid: string): Promise<{ getCharacteristics(): Promise<CharacteristicLike[]> }>
}
interface DeviceLike { id: string; name?: string; gatt?: GattLike; forget?(): Promise<void> }
interface BluetoothLike { requestDevice(options: object): Promise<DeviceLike>; getDevices?(): Promise<DeviceLike[]> }

export const SPP_UUID = '00001101-0000-1000-8000-00805f9b34fb'
/** GATT print channels of common BLE/dual-mode ESC/POS printers (Xprinter, MTP, Goojprt, Epson TM-P…). */
export const BLE_PRINTERS = [
  { service: '000018f0-0000-1000-8000-00805f9b34fb', characteristic: '00002af1-0000-1000-8000-00805f9b34fb' },
  { service: '49535343-fe7d-4ae5-8fa9-9fafd205e455', characteristic: '49535343-8841-43f4-a8d4-ecbe34729bb3' },
  { service: 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', characteristic: 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f' },
  { service: '0000ff00-0000-1000-8000-00805f9b34fb', characteristic: '0000ff02-0000-1000-8000-00805f9b34fb' },
]
export const BLE_PRINTER_SERVICES = BLE_PRINTERS.map(printer => printer.service)
// Acknowledged writes pace the printer and may span 100 bytes; unacknowledged ones are silently
// truncated above the default MTU payload (20 bytes) on macOS, which leaves a raster command unfinished.
const BLE_CHUNK = 100
const BLE_UNACKED_CHUNK = 20
const SERIAL_CHUNK = 4096
const DEFAULT_NAME = 'Imprimante Bluetooth'
const SAVED_KEY = 'warko:bluetooth-printer'

export type BluetoothRoute = 'serial' | 'ble'
export interface SavedBluetoothPrinter { route: BluetoothRoute; name: string }
export interface BluetoothPrinter {
  name: string
  send(bytes: Uint8Array, onProgress?: (ratio: number) => void): Promise<void>
  close(): Promise<void>
}

// The chosen device stays usable for the whole app session (client navigations included), so later
// prints reconnect without a chooser even where Chrome cannot persist BLE grants (getDevices).
let session: { port: SerialPortLike } | { device: DeviceLike } | null = null
export function clearBluetoothSession() { session = null }

function apis(nav: Navigator) {
  const { serial, bluetooth } = nav as Navigator & { serial?: SerialLike; bluetooth?: BluetoothLike }
  return { serial, bluetooth }
}
/** Supported routes, preferred first: BLE lists nearby printers without Android pairing; SPP needs pairing first. */
export function bluetoothRoutes(nav: Navigator = navigator): BluetoothRoute[] {
  const { serial, bluetooth } = apis(nav)
  return [...(bluetooth ? ['ble' as const] : []), ...(serial ? ['serial' as const] : [])]
}
export function chunkBytes(bytes: Uint8Array, size: number): Uint8Array[] {
  const chunks: Uint8Array[] = []
  for (let i = 0; i < bytes.length; i += size) chunks.push(bytes.subarray(i, i + size))
  return chunks
}
/** Last printer connected on this device, for display and to reopen the right chooser. */
export function savedBluetoothPrinter(): SavedBluetoothPrinter | null {
  try {
    const value = JSON.parse(globalThis.localStorage?.getItem(SAVED_KEY) ?? 'null')
    return (value?.route === 'serial' || value?.route === 'ble') && typeof value.name === 'string' ? { route: value.route, name: value.name } : null
  } catch { return null }
}
function savePrinter(printer: SavedBluetoothPrinter) {
  try { globalThis.localStorage?.setItem(SAVED_KEY, JSON.stringify(printer)) } catch { /* Device storage may be disabled. */ }
}
function isSppPort(port: SerialPortLike) {
  const id = port.getInfo().bluetoothServiceClassId
  return id === SPP_UUID || id === 0x1101
}

export function bluetoothErrorMessage(caught: unknown): string {
  const name = caught instanceof Error || caught instanceof DOMException ? caught.name : ''
  if (name === 'NotFoundError') return 'Aucune imprimante choisie. Allumez-la, rapprochez-la et réessayez. Si elle n’apparaît pas, ouvrez « Votre imprimante n’apparaît pas ? ».'
  if (name === 'SecurityError' || name === 'NotAllowedError') return 'Chrome n’a pas accès au Bluetooth. Autorisez « Appareils à proximité » pour Chrome, puis réessayez.'
  if (name === 'NetworkError' || name === 'InvalidStateError') return 'Imprimante injoignable. Vérifiez qu’elle est allumée, proche et non connectée à un autre téléphone.'
  if (caught instanceof Error && !(caught instanceof DOMException) && caught.message) return caught.message
  return 'Impression Bluetooth impossible. Rapprochez l’imprimante et réessayez.'
}

/**
 * Must be the first await after the user's tap: choosers require transient user activation.
 * Without `route`, reuses the printer of this session or granted to this site; with it, always shows the chooser.
 */
export async function openBluetoothPrinter(route?: BluetoothRoute, nav: Navigator = navigator): Promise<BluetoothPrinter> {
  const { serial, bluetooth } = apis(nav)
  if (!route) {
    if (session) return 'port' in session ? openSerial(session.port) : openBle(session.device)
    const saved = savedBluetoothPrinter()
    const device = bluetooth?.getDevices && (await bluetooth.getDevices())[0]
    const port = serial && (await serial.getPorts()).find(isSppPort)
    if (device && (saved?.route !== 'serial' || !port)) return remember(await openBle(device), { device })
    if (port) return remember(await openSerial(port), { port }, saved?.name)
    const routes = bluetoothRoutes(nav)
    route = saved && routes.includes(saved.route) ? saved.route : routes[0]
  }
  if (route === 'serial' && serial) {
    const port = await serial.requestPort({ filters: [{ bluetoothServiceClassId: SPP_UUID }], allowedBluetoothServiceClassIds: [SPP_UUID] })
    await forgetOthers(serial, bluetooth, { port })
    return remember(await openSerial(port), { port })
  }
  if (route === 'ble' && bluetooth) {
    const device = await bluetooth.requestDevice({ filters: BLE_PRINTER_SERVICES.map(service => ({ services: [service] })), optionalServices: BLE_PRINTER_SERVICES })
    await forgetOthers(serial, bluetooth, { device })
    return remember(await openBle(device), { device })
  }
  throw new Error('Le Bluetooth direct nécessite Chrome sur Android. Sur iPhone/iPad, utilisez l’impression système.')
}
function remember(printer: BluetoothPrinter, target: { port: SerialPortLike } | { device: DeviceLike }, name = printer.name) {
  session = target
  savePrinter({ route: 'port' in target ? 'serial' : 'ble', name })
  return printer
}

/** Chooses and checks a printer without printing, so connecting and printing stay two distinct steps. */
export async function connectBluetoothPrinter(route: BluetoothRoute, nav: Navigator = navigator): Promise<SavedBluetoothPrinter> {
  const printer = await openBluetoothPrinter(route, nav)
  await printer.close()
  return savedBluetoothPrinter() ?? { route, name: printer.name }
}

/** Keeps a single granted printer so the next tap prints without a chooser. */
async function forgetOthers(serial: SerialLike | undefined, bluetooth: BluetoothLike | undefined, keep: { port?: SerialPortLike; device?: DeviceLike }) {
  try {
    const ports = serial ? (await serial.getPorts()).filter(port => port !== keep.port && isSppPort(port)) : []
    const devices = bluetooth?.getDevices ? (await bluetooth.getDevices()).filter(device => device.id !== keep.device?.id) : []
    await Promise.all([...ports.map(port => port.forget?.()), ...devices.map(device => device.forget?.())])
  } catch { /* Forgetting is housekeeping; printing must not fail because of it. */ }
}

async function openSerial(port: SerialPortLike): Promise<BluetoothPrinter> {
  try { await port.open({ baudRate: 9600 }) }
  catch (caught) { if (!(caught instanceof DOMException && caught.name === 'InvalidStateError' && port.writable)) throw caught }
  return {
    name: DEFAULT_NAME,
    async send(bytes, onProgress) {
      if (!port.writable) throw new Error('Imprimante injoignable. Vérifiez qu’elle est allumée et réessayez.')
      const writer = port.writable.getWriter()
      try {
        const chunks = chunkBytes(bytes, SERIAL_CHUNK)
        for (let i = 0; i < chunks.length; i++) { await writer.write(chunks[i]); onProgress?.((i + 1) / chunks.length) }
        await writer.close()
      } finally { writer.releaseLock() }
    },
    async close() { await port.close().catch(() => undefined) },
  }
}

async function openBle(device: DeviceLike): Promise<BluetoothPrinter> {
  if (!device.gatt) throw new Error('Cette imprimante n’accepte pas le Bluetooth direct. Essayez « Changer d’imprimante ».')
  const gatt = await device.gatt.connect()
  let target: CharacteristicLike | undefined
  for (const known of BLE_PRINTERS) {
    const characteristics: CharacteristicLike[] = await gatt.getPrimaryService(known.service).then(service => service.getCharacteristics()).catch(() => [])
    const writable = characteristics.filter(c => c.properties.write || c.properties.writeWithoutResponse)
    // Some modules expose several writable channels (control, notify); only the print channel feeds the printer.
    target = writable.find(c => c.uuid === known.characteristic) ?? writable[0]
    if (target) break
  }
  if (!target) {
    gatt.disconnect()
    throw new Error('Cette imprimante Bluetooth n’est pas compatible. Associez-la dans Android puis choisissez « Changer d’imprimante ».')
  }
  const characteristic = target
  const acked = characteristic.properties.write
  const write = acked
    ? (chunk: Uint8Array) => characteristic.writeValueWithResponse(chunk as Uint8Array<ArrayBuffer>)
    : (chunk: Uint8Array) => characteristic.writeValueWithoutResponse(chunk as Uint8Array<ArrayBuffer>)
  console.info('[Warko] Imprimante BLE', { name: device.name, characteristic: characteristic.uuid, acked })
  return {
    name: device.name || DEFAULT_NAME,
    async send(bytes, onProgress) {
      const chunks = chunkBytes(bytes, acked ? BLE_CHUNK : BLE_UNACKED_CHUNK)
      for (let i = 0; i < chunks.length; i++) { await write(chunks[i]); onProgress?.((i + 1) / chunks.length) }
    },
    async close() { gatt.disconnect() },
  }
}
