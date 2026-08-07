import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { supportWhatsAppUrl } from '@/lib/support'

export default function SupportPage() {
  const whatsapp = supportWhatsAppUrl(process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP)
  return <div className="mx-auto max-w-2xl space-y-6"><div><h1 className="text-2xl font-bold text-gray-900">Support</h1><p className="mt-1 text-sm text-gray-500">Une question ou un problème ? Notre équipe vous accompagne.</p></div>
    <Card><CardHeader><h2 className="font-semibold text-gray-900">Contacter Warko</h2></CardHeader><CardContent className="space-y-4">
      {whatsapp ? <a href={whatsapp} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700">Écrire sur WhatsApp</a> : <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">WhatsApp n’est pas encore configuré. Utilisez l’email ci-dessous.</div>}
      <a href="mailto:support@warko.app?subject=Support%20Warko" className="flex min-h-12 items-center justify-center rounded-lg border border-indigo-300 bg-white px-4 py-3 font-semibold text-indigo-600 hover:bg-indigo-50">support@warko.app</a>
      <p className="text-center text-xs text-gray-500">Précisez votre boutique et la page concernée pour obtenir une réponse plus rapide.</p>
    </CardContent></Card></div>
}
