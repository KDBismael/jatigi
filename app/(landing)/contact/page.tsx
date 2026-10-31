import { InformationPage } from '@/components/landing/information-page'
import { supportWhatsAppUrl } from '@/lib/support'
export default function ContactPage(){const whatsapp=supportWhatsAppUrl(process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP);return <InformationPage title="Contacter Warko">
 <p>Pour une question sur les offres, votre compte, vos données ou un paiement, écrivez au support. Précisez le nom de votre boutique et la page concernée. Pour un paiement, ajoutez sa référence, sans communiquer de code confidentiel.</p>
 {whatsapp&&<p><a className="underline" href={whatsapp} target="_blank" rel="noreferrer">Écrire sur WhatsApp</a></p>}
 </InformationPage>}
