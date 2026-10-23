import { describe, expect, it, vi } from 'vitest'
import { BLE_PRINTERS, BLE_PRINTER_SERVICES, SPP_UUID, bluetoothErrorMessage, bluetoothRoutes, chunkBytes, openBluetoothPrinter } from '@/lib/bluetooth-printer'

function serialPort(id: string | number = SPP_UUID) {
  const written: Uint8Array[] = []
  const port = {
    getInfo: () => ({ bluetoothServiceClassId: id }),
    open: vi.fn().mockResolvedValue(undefined), close: vi.fn().mockResolvedValue(undefined), forget: vi.fn().mockResolvedValue(undefined),
    writable: new WritableStream<Uint8Array>({ write: chunk => { written.push(chunk) } }),
  }
  return { port, written }
}
const writer = (uuid: string, properties: { write: boolean; writeWithoutResponse: boolean }) =>
  ({ uuid, properties, writeValueWithResponse: vi.fn().mockResolvedValue(undefined), writeValueWithoutResponse: vi.fn().mockResolvedValue(undefined) })
function bleDevice(id: string, properties = { write: true, writeWithoutResponse: false }, known = BLE_PRINTERS[0]) {
  const characteristic = writer(known.characteristic, properties)
  // A writable control channel listed first must not receive the ticket.
  const decoy = writer('control', { write: true, writeWithoutResponse: true })
  const gatt = {
    connect: vi.fn(), disconnect: vi.fn(),
    getPrimaryService: vi.fn(async (uuid: string) => {
      if (uuid !== known.service) throw new DOMException('absent', 'NotFoundError')
      return { getCharacteristics: async () => [writer('notify', { write: false, writeWithoutResponse: false }), decoy, characteristic] }
    }),
  }
  gatt.connect.mockResolvedValue(gatt)
  return { device: { id, name: 'YHD-8390_BLE', gatt, forget: vi.fn().mockResolvedValue(undefined) }, gatt, characteristic, decoy }
}
const nav = (apis: object) => apis as unknown as Navigator

describe('imprimante Bluetooth sans application tierce', () => {
  it('préfère le Bluetooth classique (SPP) et ne propose rien hors Chrome', () => {
    expect(bluetoothRoutes(nav({ serial: {}, bluetooth: {} }))).toEqual(['serial', 'ble'])
    expect(bluetoothRoutes(nav({ bluetooth: {} }))).toEqual(['ble'])
    expect(bluetoothRoutes(nav({}))).toEqual([])
  })
  it('découpe les octets sans copier ni perdre la fin', () => {
    expect(chunkBytes(new Uint8Array([1, 2, 3, 4, 5]), 2).map(c => [...c])).toEqual([[1, 2], [3, 4], [5]])
  })
  it('réutilise l’imprimante mémorisée sans rouvrir le sélecteur', async () => {
    const { port, written } = serialPort()
    const serial = { getPorts: vi.fn().mockResolvedValue([serialPort(0x1234).port, port]), requestPort: vi.fn() }
    const printer = await openBluetoothPrinter(undefined, nav({ serial }))
    const progress = vi.fn()
    await printer.send(new Uint8Array(5000), progress)
    await printer.close()
    expect(serial.requestPort).not.toHaveBeenCalled()
    expect(port.open).toHaveBeenCalledWith({ baudRate: 9600 })
    expect(written.map(c => c.length)).toEqual([4096, 904])
    expect(progress).toHaveBeenLastCalledWith(1)
    expect(port.close).toHaveBeenCalled()
  })
  it('ouvre le sélecteur SPP la première fois puis oublie les anciennes imprimantes', async () => {
    const chosen = serialPort().port, old = serialPort().port
    const oldBle = bleDevice('old').device
    const serial = { getPorts: vi.fn().mockResolvedValueOnce([]).mockResolvedValue([old, chosen]), requestPort: vi.fn().mockResolvedValue(chosen) }
    const bluetooth = { getDevices: vi.fn().mockResolvedValueOnce([]).mockResolvedValue([oldBle]), requestDevice: vi.fn() }
    await openBluetoothPrinter(undefined, nav({ serial, bluetooth }))
    expect(serial.requestPort).toHaveBeenCalledWith(expect.objectContaining({ filters: [{ bluetoothServiceClassId: SPP_UUID }] }))
    expect(bluetooth.requestDevice).not.toHaveBeenCalled()
    expect(old.forget).toHaveBeenCalled()
    expect(oldBle.forget).toHaveBeenCalled()
    expect(chosen.forget).not.toHaveBeenCalled()
  })
  it('envoie en BLE par écritures acquittées de 100 octets sur le canal d’impression connu', async () => {
    const { device, gatt, characteristic, decoy } = bleDevice('printer', { write: true, writeWithoutResponse: true }, BLE_PRINTERS[1])
    const bluetooth = { getDevices: vi.fn().mockResolvedValue([]), requestDevice: vi.fn().mockResolvedValue(device) }
    const printer = await openBluetoothPrinter('ble', nav({ bluetooth }))
    await printer.send(new Uint8Array(250))
    await printer.close()
    expect(bluetooth.requestDevice).toHaveBeenCalledWith(expect.objectContaining({ optionalServices: BLE_PRINTER_SERVICES }))
    expect(printer.name).toBe('YHD-8390_BLE')
    expect(characteristic.writeValueWithResponse.mock.calls.map(([chunk]) => chunk.length)).toEqual([100, 100, 50])
    expect(characteristic.writeValueWithoutResponse).not.toHaveBeenCalled()
    expect(decoy.writeValueWithResponse).not.toHaveBeenCalled()
    expect(gatt.disconnect).toHaveBeenCalled()
  })
  it('limite les écritures non acquittées à 20 octets pour ne pas être tronquées', async () => {
    const { device, characteristic } = bleDevice('printer', { write: false, writeWithoutResponse: true })
    const printer = await openBluetoothPrinter('ble', nav({ bluetooth: { requestDevice: vi.fn().mockResolvedValue(device) } }))
    await printer.send(new Uint8Array(45))
    expect(characteristic.writeValueWithoutResponse.mock.calls.map(([chunk]) => chunk.length)).toEqual([20, 20, 5])
  })
  it('rouvre le sélecteur qui a fonctionné quand le navigateur ne mémorise pas l’imprimante BLE', async () => {
    const stored = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => stored.set(key, value) })
    const { device } = bleDevice('printer')
    const serial = { getPorts: vi.fn().mockResolvedValue([]), requestPort: vi.fn() }
    const bluetooth = { requestDevice: vi.fn().mockResolvedValue(device) }
    await openBluetoothPrinter('ble', nav({ serial, bluetooth }))
    await openBluetoothPrinter(undefined, nav({ serial, bluetooth }))
    expect(serial.requestPort).not.toHaveBeenCalled()
    expect(bluetooth.requestDevice).toHaveBeenCalledTimes(2)
    vi.unstubAllGlobals()
  })
  it('refuse une imprimante BLE sans service compatible et libère la connexion', async () => {
    const { device, gatt } = bleDevice('other', undefined, { service: 'unknown-service', characteristic: 'x' })
    const bluetooth = { getDevices: vi.fn().mockResolvedValue([device]), requestDevice: vi.fn() }
    await expect(openBluetoothPrinter(undefined, nav({ bluetooth }))).rejects.toThrow(/pas compatible/)
    expect(gatt.disconnect).toHaveBeenCalled()
  })
  it('explique les erreurs du navigateur en français', async () => {
    expect(bluetoothErrorMessage(new DOMException('cancel', 'NotFoundError'))).toMatch(/Aucune imprimante choisie/)
    expect(bluetoothErrorMessage(new DOMException('denied', 'SecurityError'))).toMatch(/Appareils à proximité/)
    expect(bluetoothErrorMessage(new DOMException('gatt', 'NetworkError'))).toMatch(/injoignable/)
    await expect(openBluetoothPrinter(undefined, nav({}))).rejects.toThrow(/Chrome sur Android/)
  })
})
