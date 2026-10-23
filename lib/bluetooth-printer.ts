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
/** GATT services exposed by common BLE/dual-mode ESC/POS printers (Xprinter, MTP, Goojprt, Epson TM-P…). */
export const BLE_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '0000ff00-0000-1000-8000-00805f9b34fb',
]
// BLE payloads above ~100 bytes fail on printers that keep the default MTU; SPP streams freely.
const BLE_CHUNK = 100
const SERIAL_CHUNK = 4096
const DEFAULT_NAME = 'Imprimante Bluetooth'

export type BluetoothRoute = 'serial' | 'ble'
export interface BluetoothPrinter {
  name: string
  send(bytes: Uint8Array, onProgress?: (ratio: number) => void): Promise<void>
  close(): Promise<void>
}

function apis(nav: Navigator) {
  const { serial, bluetooth } = nav as Navigator & { serial?: SerialLike; bluetooth?: BluetoothLike }
  return { serial, bluetooth }
}
/** Supported routes, preferred first: SPP covers most receipt printers, BLE needs no Android pairing. */
export function bluetoothRoutes(nav: Navigator = navigator): BluetoothRoute[] {
  const { serial, bluetooth } = apis(nav)
  return [...(serial ? ['serial' as const] : []), ...(bluetooth ? ['ble' as const] : [])]
}
export function chunkBytes(bytes: Uint8Array, size: number): Uint8Array[] {
  const chunks: Uint8Array[] = []
  for (let i = 0; i < bytes.length; i += size) chunks.push(bytes.subarray(i, i + size))
  return chunks
}
function isSppPort(port: SerialPortLike) {
  const id = port.getInfo().bluetoothServiceClassId
  return id === SPP_UUID || id === 0x1101
}

export function bluetoothErrorMessage(caught: unknown): string {
  const name = caught instanceof Error || caught instanceof DOMException ? caught.name : ''
  if (name === 'NotFoundError') return 'Aucune imprimante choisie. Allumez-la, puis appuyez de nouveau sur Imprimer.'
  if (name === 'SecurityError' || name === 'NotAllowedError') return 'Chrome n’a pas accès au Bluetooth. Autorisez « Appareils à proximité » pour Chrome, puis réessayez.'
  if (name === 'NetworkError' || name === 'InvalidStateError') return 'Imprimante injoignable. Vérifiez qu’elle est allumée, proche et non connectée à un autre téléphone.'
  if (caught instanceof Error && !(caught instanceof DOMException) && caught.message) return caught.message
  return 'Impression Bluetooth impossible. Rapprochez l’imprimante et réessayez.'
}

/**
 * Must be the first await after the user's tap: choosers require transient user activation.
 * Without `route`, reuses the printer already granted to this site; with it, always shows the chooser.
 */
export async function openBluetoothPrinter(route?: BluetoothRoute, nav: Navigator = navigator): Promise<BluetoothPrinter> {
  const { serial, bluetooth } = apis(nav)
  if (!route) {
    const port = serial && (await serial.getPorts()).find(isSppPort)
    if (port) return openSerial(port)
    const device = bluetooth?.getDevices && (await bluetooth.getDevices())[0]
    if (device) return openBle(device)
    route = bluetoothRoutes(nav)[0]
  }
  if (route === 'serial' && serial) {
    const port = await serial.requestPort({ filters: [{ bluetoothServiceClassId: SPP_UUID }], allowedBluetoothServiceClassIds: [SPP_UUID] })
    await forgetOthers(serial, bluetooth, { port })
    return openSerial(port)
  }
  if (route === 'ble' && bluetooth) {
    const device = await bluetooth.requestDevice({ filters: BLE_PRINTER_SERVICES.map(service => ({ services: [service] })), optionalServices: BLE_PRINTER_SERVICES })
    await forgetOthers(serial, bluetooth, { device })
    return openBle(device)
  }
  throw new Error('Le Bluetooth direct nécessite Chrome sur Android. Sur iPhone/iPad, utilisez l’impression système.')
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
  for (const uuid of BLE_PRINTER_SERVICES) {
    const characteristics = await gatt.getPrimaryService(uuid).then(service => service.getCharacteristics()).catch(() => [])
    target = characteristics.find(c => c.properties.writeWithoutResponse || c.properties.write)
    if (target) break
  }
  if (!target) {
    gatt.disconnect()
    throw new Error('Cette imprimante Bluetooth n’est pas compatible. Associez-la dans Android puis choisissez « Changer d’imprimante ».')
  }
  const characteristic = target
  const write = characteristic.properties.writeWithoutResponse
    ? (chunk: Uint8Array) => characteristic.writeValueWithoutResponse(chunk as Uint8Array<ArrayBuffer>)
    : (chunk: Uint8Array) => characteristic.writeValueWithResponse(chunk as Uint8Array<ArrayBuffer>)
  return {
    name: device.name || DEFAULT_NAME,
    async send(bytes, onProgress) {
      const chunks = chunkBytes(bytes, BLE_CHUNK)
      for (let i = 0; i < chunks.length; i++) { await write(chunks[i]); onProgress?.((i + 1) / chunks.length) }
    },
    async close() { gatt.disconnect() },
  }
}
