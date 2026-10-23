'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { PrinterPicker } from '@/components/orders/printer-picker'
import { usePrinterSettings } from '@/hooks/use-printer-settings'
import { formatDocumentMoney as money, type DocumentFormat, type OrderDocument } from '@/lib/order-document'

export function OrderPrintView({ document: doc, orderId, initialFormat, preferenceKey, initialOpen = false }: {
  document: OrderDocument; orderId: string; initialFormat: DocumentFormat; preferenceKey: string; initialOpen?: boolean
}) {
  const preferences = usePrinterSettings(preferenceKey)
  const format = preferences.hasPreferences ? preferences.settings.format : initialFormat
  const [pickerOpen, setPickerOpen] = useState(initialOpen)
  const [height, setHeight] = useState(297)
  const [printing, setPrinting] = useState(false)
  const sheet = useRef<HTMLElement>(null)
  const thermal = format !== 'a4'
  useEffect(() => {
    const element = sheet.current
    if (!element) return
    const observer = new ResizeObserver(() => setHeight(Math.ceil(element.getBoundingClientRect().height * 25.4 / 96) + 2))
    observer.observe(element)
    return () => observer.disconnect()
  }, [format])
  async function print() {
    setPrinting(true)
    try {
      await document.fonts.ready
      await Promise.all(Array.from(sheet.current?.querySelectorAll('img') ?? []).map(img => img.decode().catch(() => undefined)))
      window.print()
    } finally { setPrinting(false) }
  }
  return <main className="order-print print-page min-h-screen bg-gray-100 px-3 py-6 text-black">
    <style media="print">{`@page { size: ${thermal ? `${format === '58mm' ? 58 : 80}mm ${height}mm` : 'A4'}; margin: ${thermal ? '0' : '16mm'}; }`}</style>
    <div className="print-actions mx-auto mb-4 flex max-w-4xl flex-wrap items-end justify-center gap-3">
      <Select id="document-format" label="Format d’impression" value={format} onChange={event => preferences.save({ ...preferences.settings, format: event.target.value as DocumentFormat })} options={[{ value: 'a4', label: 'A4' }, { value: '58mm', label: 'Ticket 58 mm' }, { value: '80mm', label: 'Ticket 80 mm' }]} />
      <Button onClick={() => setPickerOpen(true)} disabled={printing}>{printing ? 'Préparation…' : 'Imprimer'}</Button>
      <a className="inline-flex rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900" href={`/api/orders/${orderId}/document?format=${format}`}>Télécharger PDF</a>
      <Link className="px-2 py-2 text-sm text-indigo-700 underline" href="/orders/new">Nouvelle commande</Link>
      <Link className="px-2 py-2 text-sm text-gray-600 underline" href="/orders">Retour aux commandes</Link>
      <p className="w-full text-center text-xs text-gray-600">Impression système / AirPrint, Bluetooth direct sur Android (Chrome), ou ordinateur avec QZ Tray.</p>
      {pickerOpen && <PrinterPicker orderId={orderId} settings={{ ...preferences.settings, format }} onSettingsChange={preferences.save}
        onSystemPrint={print} getElement={() => sheet.current} onClose={() => setPickerOpen(false)} />}
    </div>
    <div className="overflow-x-auto print:overflow-visible">
      <article ref={sheet} data-format={format} className={`order-document mx-auto bg-white text-black shadow-lg ${thermal ? 'order-document-thermal' : 'order-document-a4'}`} style={{ width: thermal ? (format === '58mm' ? '58mm' : '80mm') : '210mm' }}>
        <header className="document-header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {doc.logoUrl && <img src={doc.logoUrl} alt={`Logo ${doc.organizationName}`} className="document-logo" />}
          <h1>{doc.organizationName}</h1><p className="document-title">Bon de commande</p>
          <div className="document-meta"><span>N° {doc.reference}</span><span>{doc.date}</span></div>
        </header>
        <section className="document-parties">
          <p><strong>Client :</strong> {doc.clientName}</p>
          {doc.clientPhone && <p><strong>Téléphone :</strong> {doc.clientPhone}</p>}
          <p><strong>Vendeur :</strong> {doc.seller}</p>
          {doc.deliveryLocation && <p><strong>Livraison :</strong> {doc.deliveryLocation}</p>}
          {doc.deliveryDriver && <p><strong>Livreur :</strong> {doc.deliveryDriver}</p>}
        </section>
        <section aria-label="Produits commandés" className="document-lines">
          {doc.lines.map((line, index) => <div key={index} className="document-line">
            <p className="document-product">{line.name}</p>{line.detail && <p>{line.detail}</p>}
            <div className="document-amount"><span>Qté : {line.quantity}</span><span>Prix : {money(line.price)}</span></div>
            {line.discountReason && <><div className="document-amount"><span>Avant remise</span><span>{money(line.subtotal)}</span></div><div className="document-amount"><span>Remise</span><span>-{money(line.discountAmount)}</span></div><p className="document-reason">Motif : {line.discountReason}</p></>}
            <div className="document-amount document-line-total"><span>Total ligne</span><span>{money(line.total)}</span></div>
          </div>)}
        </section>
        <section className="document-totals">
          <Amount label="Sous-total" amount={doc.totals.subtotal} />
          <Amount label="Remises" amount={-doc.totals.discount} />
          <Amount label="Livraison" amount={doc.totals.deliveryFee} />
          <Amount label="Montant total" amount={doc.totals.totalAmount} strong />
          <Amount label="Dépôt payé" amount={doc.totals.confirmationAmount} />
          <Amount label="Reste à payer" amount={doc.totals.remainingAmount} strong />
        </section>
        <footer className="document-footer"><p>Merci pour votre confiance.</p><p>Document généré par Warko</p></footer>
      </article>
    </div>
  </main>
}
function Amount({ label, amount, strong = false }: { label: string; amount: number; strong?: boolean }) {
  return <div className={`document-amount ${strong ? 'document-emphasis' : ''}`}><span>{label}</span><span>{money(amount)}</span></div>
}
