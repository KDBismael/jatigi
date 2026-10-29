import Link from 'next/link'
import { PlanCards } from '@/components/billing/plan-cards'
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <Link href="/" className="text-xl font-bold">
          Warko
        </Link>
        <div className="flex gap-5 text-sm">
          <a href="#tarifs">Tarifs</a>
          <Link href="/auth/login">Se connecter</Link>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-6">
        <section className="grid gap-8 py-12 md:grid-cols-2 md:py-20">
          <div>
            <p className="text-indigo-300 mb-4">
              Votre boutique. Vos commandes. Votre argent.
            </p>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Vous savez combien vos livreurs vous doivent ce soir ?
            </h1>
            <p className="mt-5 text-gray-300">
              Vos clients commandent sur WhatsApp, Facebook ou Instagram.
              Centralisez vos commandes dans Warko et suivez les encaissements,
              les frais et les reversements de chaque livreur.
            </p>
            <Link
              href="/auth/signup"
              className="inline-block mt-6 rounded-xl bg-indigo-600 px-6 py-3 font-bold"
            >
              Essayer gratuitement
            </Link>
            <p className="mt-3 text-sm text-gray-400">
              30 commandes par mois offertes. Aucune carte requise.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-700 p-6 bg-gray-900 self-center">
            <p className="text-sm text-gray-400">
              Exemple illustratif · Bilan d’un livreur
            </p>
            <h2 className="text-xl mt-3 font-bold">
              Le point sur votre journée
            </h2>
            <dl className="mt-6 space-y-3">
              <div className="flex justify-between">
                <dt>Encaissé</dt>
                <dd>50 000 FCFA</dd>
              </div>
              <div className="flex justify-between">
                <dt>Frais de livraison</dt>
                <dd>5 000 FCFA</dd>
              </div>
              <div className="flex justify-between">
                <dt>Déjà reversé</dt>
                <dd>30 000 FCFA</dd>
              </div>
              <div className="flex justify-between border-t border-gray-700 pt-4 text-indigo-300">
                <dt>Reste à reverser</dt>
                <dd className="font-bold">15 000 FCFA</dd>
              </div>
            </dl>
          </div>
        </section>
        <section id="tarifs" className="py-8">
          <h2 className="text-3xl font-bold mb-3">
            Un plan pour chaque étape de votre boutique
          </h2>
          <p className="text-gray-400 mb-6">
            Mensuel ou annuel. Pro : 48 000 FCFA/an. Business : 96 000 FCFA/an.
          </p>
          <PlanCards publicPage />
          <p className="mt-4 text-sm text-gray-400">
            Tarifs annuels : <span>48 000</span> FCFA pour Pro et 96 000 FCFA
            pour Business. Paiement confirmé à chaque renouvellement.
          </p>
        </section>
        <section className="py-12">
          <h2 className="text-3xl font-bold">
            Le soir, les comptes doivent être clairs.
          </h2>
          <p className="mt-4 text-gray-300 max-w-3xl">
            Entre le cahier et les messages, il est difficile de reconstituer ce
            qui a été encaissé. Warko relie commandes, livraisons et
            reversements pour retrouver les montants dus sans refaire tous les
            calculs.
          </p>
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            {[
              ['1. Ajoutez votre produit', 'Renseignez son prix et son stock.'],
              [
                '2. Ajoutez votre livreur',
                'Retrouvez ses livraisons et son solde.',
              ],
              [
                '3. Créez votre commande',
                'Suivez son statut puis enregistrez le reversement.',
              ],
            ].map(([title, text]) => (
              <article
                key={title}
                className="rounded-xl border border-gray-700 p-5"
              >
                <h3 className="font-bold">{title}</h3>
                <p className="text-gray-400 mt-3">{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="py-8">
          <h2 className="text-3xl font-bold">
            Toute votre activité au même endroit
          </h2>
          <p className="mt-4 text-gray-300">
            Commandes et statuts, catalogue et stocks, dépenses et rentabilité,
            bons de commande et rôles d’équipe selon votre plan.
          </p>
        </section>
        <section className="py-12 max-w-3xl">
          <h2 className="text-3xl font-bold mb-6">Vos questions</h2>
          {[
            [
              'Puis-je commencer gratuitement ?',
              'Oui. Découverte comprend 30 commandes par mois, un livreur et le compte propriétaire.',
            ],
            [
              'Mes commandes WhatsApp sont-elles importées automatiquement ?',
              'Vous saisissez vos commandes dans Warko, quel que soit leur canal de vente.',
            ],
            [
              'Que se passe-t-il à la limite du plan ?',
              'Vos données restent accessibles. Passez à un plan supérieur pour créer au-delà des limites.',
            ],
            [
              'Comment payer ?',
              'Choisissez votre plan depuis votre compte puis payez sur la page sécurisée du prestataire. Votre plan change après confirmation.',
            ],
          ].map(([q, a]) => (
            <details key={q} className="border-b border-gray-700 py-4">
              <summary className="cursor-pointer font-semibold">{q}</summary>
              <p className="mt-3 text-gray-300">{a}</p>
            </details>
          ))}
        </section>
        <section className="py-12 text-center">
          <h2 className="text-3xl font-bold">
            Faites le point sur votre première livraison.
          </h2>
          <Link
            href="/auth/signup"
            className="inline-block mt-6 rounded-xl bg-indigo-600 px-6 py-3 font-bold"
          >
            Essayer gratuitement
          </Link>
        </section>
      </main>
      <footer className="border-t border-gray-800 px-6 py-6 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} Warko · Gestion des commandes et des
        reversements COD
      </footer>
    </div>
  )
}
