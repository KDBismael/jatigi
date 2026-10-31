import { SUPPORT_EMAIL, SITE_OPERATOR } from '@/lib/site-contact'
import Link from 'next/link'
export function InformationPage({title,children}:{title:string;children:React.ReactNode}) {
 return <main className="mx-auto max-w-3xl px-6 py-12 text-[#12142a]">
  <Link href="/" className="text-sm underline">Retour à l’accueil</Link>
  <h1 className="mb-8 mt-8 text-3xl font-bold">{title}</h1>
  <div className="space-y-6 text-base leading-7">{children}</div>
  <p className="mt-8">Exploitant : {SITE_OPERATOR.name} · {SITE_OPERATOR.location}.</p>
  <p className="mt-3">Contact : <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
  <nav aria-label="Informations Warko" className="mt-8 flex flex-wrap gap-5 text-sm underline"><Link href="/conditions">Conditions</Link><Link href="/confidentialite">Confidentialité</Link><Link href="/contact">Contact</Link></nav>
 </main>
}
