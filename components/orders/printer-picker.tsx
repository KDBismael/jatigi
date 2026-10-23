'use client'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import type { PrinterSettings } from '@/lib/printer-settings'
import type { DocumentFormat } from '@/lib/order-document'
import { findDesktopPrinters, prepareAndroidReceipt, printBluetoothReceipt, printDesktopPdf } from '@/lib/printer-transport'
import { bluetoothErrorMessage, bluetoothRoutes, connectBluetoothPrinter, savedBluetoothPrinter, type BluetoothRoute } from '@/lib/bluetooth-printer'

const methods = [
  ['bluetooth', 'Bluetooth · imprimante ticket', '58 / 80 mm · directement depuis Chrome, sans application à installer'],
  ['system', 'Impression système / AirPrint', 'A4 ou ticket · imprimantes proposées par votre appareil'],
  ['qz', 'Ordinateur · USB / réseau avec QZ Tray', 'Imprimantes installées sur Windows, macOS ou Linux'],
] as const
const fallbackMethod = ['rawbt', 'Android · Bluetooth avec RawBT', 'Ancienne méthode · nécessite l’application RawBT configurée'] as const

interface Props {
  orderId: string
  settings: PrinterSettings
  onSettingsChange: (settings: PrinterSettings) => void
  onSystemPrint: () => Promise<void>
  getElement: () => HTMLElement | null
  onClose: () => void
}
export function PrinterPicker({ orderId, settings, onSettingsChange, onSystemPrint, getElement, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [printers, setPrinters] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [progress, setProgress] = useState<number | null>(null)
  const [androidJob, setAndroidJob] = useState<{ key: string; uri: string } | null>(null)
  const android = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
  const routes = typeof navigator !== 'undefined' ? bluetoothRoutes(navigator) : []
  const [bluetoothPrinter, setBluetoothPrinter] = useState(() => typeof window !== 'undefined' ? savedBluetoothPrinter() : null)
  const needsConnection = settings.method === 'bluetooth' && routes.length > 0 && !bluetoothPrinter
  const ticketOnly = settings.method === 'rawbt' || settings.method === 'bluetooth'
  const jobKey = `${settings.method}:${settings.format}`
  const androidUri = androidJob?.key === jobKey ? androidJob.uri : null
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const element = dialog.current
    if (element && !element.open) {
      if (typeof element.showModal === 'function') element.showModal()
      else element.setAttribute('open', '')
    }
    return () => { element?.close?.(); previous?.focus() }
  }, [])

  function change(patch: Partial<PrinterSettings>) {
    setError(''); setMessage(''); setAndroidJob(null)
    onSettingsChange({ ...settings, ...patch })
  }
  async function discover() {
    setBusy(true); setError(''); setMessage('')
    try {
      const available = await findDesktopPrinters()
      setPrinters(available)
      if (!available.length) setMessage('Aucune imprimante trouvée. Ajoutez-la dans les paramètres de votre ordinateur puis relancez la recherche.')
    } catch { setError('QZ Tray est indisponible. Installez et ouvrez QZ Tray, autorisez Warko, puis réessayez.') }
    finally { setBusy(false) }
  }
  async function connect(route: BluetoothRoute) {
    setBusy(true); setError(''); setMessage('')
    try {
      const printer = await connectBluetoothPrinter(route)
      setBluetoothPrinter(printer)
      setMessage(`${printer.name} est connectée. Appuyez sur « Imprimer maintenant ».`)
    } catch (caught) { setError(bluetoothErrorMessage(caught)) }
    finally { setBusy(false) }
  }
  async function print() {
    setBusy(true); setError(''); setMessage(''); setAndroidJob(null); setProgress(null)
    try {
      if (settings.method === 'bluetooth') {
        if (settings.format === 'a4') throw new Error('Choisissez un ticket 58 mm ou 80 mm pour le Bluetooth.')
        const name = await printBluetoothReceipt(getElement, settings.format, { onProgress: setProgress })
          .catch(caught => { throw new Error(bluetoothErrorMessage(caught)) })
        setBluetoothPrinter(savedBluetoothPrinter())
        setMessage(`Ticket envoyé à ${name}. Vérifiez le reçu avant de quitter.`)
      } else if (settings.method === 'system') {
        await onSystemPrint()
        setMessage('Fenêtre d’impression ouverte. Vous pouvez réimprimer ici si nécessaire.')
      } else if (settings.method === 'qz') {
        await printDesktopPdf(orderId, settings.format, settings.printer)
        setMessage('Envoyé à l’imprimante. Vérifiez le reçu avant de quitter.')
      } else {
        if (!android) throw new Error('RawBT nécessite un appareil Android. Choisissez l’impression système sur cet appareil.')
        if (settings.format === 'a4') throw new Error('Choisissez un ticket 58 mm ou 80 mm pour RawBT.')
        const element = getElement()
        if (!element) throw new Error('Le reçu n’est pas encore prêt. Réessayez.')
        const uri = await prepareAndroidReceipt(element, settings.format)
        setAndroidJob({ key: jobKey, uri })
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Impression impossible. Vérifiez l’imprimante et réessayez.') }
    finally { setBusy(false); setProgress(null) }
  }
  function methodOption([value, title, detail]: typeof methods[number] | typeof fallbackMethod) {
    return <label key={value} className={`flex min-h-12 cursor-pointer gap-3 rounded-xl border p-3 ${settings.method === value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}>
      <input type="radio" name="print-method" value={value} checked={settings.method === value} onChange={() => change({ method: value, ...(value !== 'system' && value !== 'qz' && settings.format === 'a4' ? { format: '58mm' } : {}) })} />
      <span><span className="block text-sm font-medium">{title}</span><span className="mt-1 block text-xs text-gray-500">{detail}</span></span>
    </label>
  }

  return <dialog ref={dialog} aria-labelledby="printer-picker-title" onCancel={event => { event.preventDefault(); if (!busy) onClose() }}
    className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 text-gray-900 shadow-xl backdrop:bg-black/40">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 id="printer-picker-title" className="text-lg font-semibold">Imprimer le reçu</h2>
      <Button variant="ghost" size="sm" onClick={onClose} disabled={busy} aria-label="Fermer le sélecteur d’imprimante">✕</Button>
    </div>
    <p className="mb-4 text-sm text-gray-500">La commande est déjà enregistrée. Réimprimer ne crée aucun doublon.</p>
    <fieldset disabled={busy} className="space-y-3">
      <legend className="sr-only">Connexion à l’imprimante</legend>
      {methods.map(methodOption)}
      <details open={settings.method === 'rawbt'} className="rounded-xl border border-dashed border-gray-200 px-3 py-2">
        <summary className="cursor-pointer py-1 text-sm text-gray-600">Autres options</summary>
        <div className="mt-2">{methodOption(fallbackMethod)}</div>
      </details>
      <Select id="picker-document-format" label="Format d’impression" value={settings.format} onChange={event => change({ format: event.target.value as DocumentFormat })}
        options={[...(ticketOnly ? [] : [{ value: 'a4', label: 'A4' }]), { value: '58mm', label: 'Ticket 58 mm' }, { value: '80mm', label: 'Ticket 80 mm' }]} />
      {settings.method === 'bluetooth' && (routes.length ? <div className="space-y-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-gray-500">Imprimante</p>
            <p className="truncate font-medium text-gray-900">{bluetoothPrinter ? bluetoothPrinter.name : 'Aucune imprimante connectée'}</p>
          </div>
          {bluetoothPrinter && <Button variant="secondary" type="button" className="min-h-11 shrink-0" onClick={() => connect(routes[0])}>Changer</Button>}
        </div>
        {!bluetoothPrinter && <p>Allumez l’imprimante, appuyez sur « Connecter l’imprimante » et choisissez-la dans la liste. Aucun réglage Android n’est nécessaire.</p>}
        {routes.length > 1 && <details>
          <summary className="cursor-pointer py-1 text-indigo-700">Votre imprimante n’apparaît pas ?</summary>
          <div className="mt-2 space-y-2">
            <p>Vérifiez qu’elle est allumée et proche du téléphone. Sinon, associez-la dans les réglages Bluetooth d’Android (code 0000 ou 1234), puis :</p>
            <Button variant="secondary" type="button" className="min-h-11" onClick={() => connect('serial')}>Choisir une imprimante associée</Button>
          </div>
        </details>}
      </div> : <p className="text-sm text-gray-600">Le Bluetooth direct nécessite Chrome sur Android. Sur iPhone/iPad, utilisez l’impression système avec une imprimante AirPrint.</p>)}
      {settings.method === 'qz' && <div className="space-y-3">
        <Button variant="secondary" type="button" onClick={discover}>Rechercher les imprimantes</Button>
        <Select id="desktop-printer" label="Imprimante" placeholder="Choisir une imprimante" value={settings.printer}
          onChange={event => change({ printer: event.target.value })}
          options={[...new Set([...(settings.printer ? [settings.printer] : []), ...printers])].map(name => ({ value: name, label: name }))} />
        <p className="text-xs text-gray-500">Installez l’imprimante dans votre ordinateur et configurez son papier au même format. QZ Tray vous demandera d’autoriser Warko.</p>
        <a className="text-sm text-indigo-700 underline" href="https://qz.io/download/" target="_blank" rel="noopener noreferrer">Installer QZ Tray</a>
      </div>}
      {settings.method === 'rawbt' && <div className="space-y-2 text-sm text-gray-600">
        <p>{android ? 'Dans RawBT, associez votre imprimante Bluetooth, choisissez le même format et faites un test d’impression.' : 'Cette connexion nécessite Android. Sur iPhone/iPad, utilisez l’impression système avec une imprimante AirPrint sur le même réseau.'}</p>
        <a className="text-indigo-700 underline" href="https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter" target="_blank" rel="noopener noreferrer">Installer / configurer RawBT</a>
      </div>}
    </fieldset>
    {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
    {message && <p role="status" className="mt-4 text-sm text-green-700">{message}</p>}
    <div className="mt-5 flex flex-wrap gap-3">
      {androidUri ? <a className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white" href={androidUri}>Envoyer à RawBT</a>
        : <Button className="min-h-11 flex-1 sm:flex-none" disabled={busy || (settings.method === 'rawbt' && !android) || (settings.method === 'bluetooth' && !routes.length) || (settings.method === 'qz' && !settings.printer)} onClick={() => needsConnection ? connect(routes[0]) : print()}>
          {busy ? (progress === null ? 'Préparation…' : `Envoi… ${Math.round(progress * 100)} %`)
            : needsConnection ? 'Connecter l’imprimante' : settings.method === 'rawbt' ? 'Préparer le ticket Bluetooth' : 'Imprimer maintenant'}
        </Button>}
      <Button className="min-h-11" variant="secondary" disabled={busy} onClick={onClose}>Fermer</Button>
    </div>
    <p className="mt-4 text-xs text-gray-500">Choix mémorisé sur cet appareil pour votre compte et votre boutique. L’envoi à un helper ne confirme pas que le papier est sorti.</p>
  </dialog>
}
