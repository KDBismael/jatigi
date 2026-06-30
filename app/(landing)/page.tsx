import Link from 'next/link'

const FEATURES = [
  {
    icon: '📦',
    title: 'Gestion des stocks intelligente',
    desc: "Ne perdez plus une vente à cause d'une rupture de stock imprévue. Warko synchronise votre inventaire en temps réel sur WhatsApp, Instagram et Facebook. Les quantités se mettent à jour instantanément après chaque vente.",
  },
  {
    icon: '💳',
    title: 'Suivi des paiements',
    desc: "Sécurisez votre trésorerie avec un suivi rigoureux. Identifiez en un coup d'œil quels livreurs détiennent vos fonds et validez les reçus Mobile Money sans erreur. Transparence totale pour une tranquillité d'esprit complète.",
  },
  {
    icon: '📈',
    title: 'Analyses des ventes',
    desc: "Prenez des décisions basées sur les données, pas sur les intuitions. Visualisez vos marges nettes, vos produits les plus performants et l'évolution mensuelle de vos ventes grâce à des tableaux de bord intuitifs et automatisés.",
  },
]

const STATS = [
  { value: '5K+', label: 'Marchands' },
  { value: '12M+', label: 'FCFA de ventes' },
  { value: '98%', label: 'Satisfaction' },
  { value: '24/7', label: 'Support local' },
]

const TESTIMONIALS = [
  {
    name: 'Awa K.',
    business: 'Boutique Mode',
    quote: "Enfin une visibilité claire sur mes finances. Je sais exactement ce que je gagne chaque jour sans passer des heures sur mon cahier.",
  },
  {
    name: 'Moussa T.',
    business: 'Vendeur Électronique',
    quote: "Le gain de temps sur les commandes WhatsApp a tout changé. Mes clients reçoivent leurs factures instantanément.",
  },
  {
    name: 'Fatou B.',
    business: 'Cosmétiques & Beauté',
    quote: "Le suivi des livreurs est incroyable. Je ne perds plus jamais trace d'un paiement Mobile Money.",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-gray-950/95 backdrop-blur border-b border-white/5 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-white">Warko</span>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Fonctionnalités</a>
            <a href="#comparaison" className="text-sm text-gray-400 hover:text-white transition-colors">Comparaison</a>
            <a href="#impact" className="text-sm text-gray-400 hover:text-white transition-colors">Impact</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm text-gray-400 hover:text-white transition-colors px-4 py-2">
              Se connecter
            </Link>
            <Link
              href="/auth/login"
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-500 transition-colors"
            >
              S&apos;inscrire
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <h1 className="text-4xl sm:text-6xl font-bold leading-tight tracking-tight text-indigo-500 max-w-4xl mx-auto">
          Gérez votre commerce facilement et sachez enfin où va votre argent.
        </h1>
        <p className="mt-6 text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto">
          Stock, ventes, commandes et bénéfices au même endroit. Pensé pour les commerçants africains.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth/login"
            className="bg-indigo-600 text-white px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-indigo-500 transition-colors text-center shadow-lg shadow-indigo-900/40"
          >
            Créer mon compte
          </Link>
          <Link
            href="/auth/login"
            className="bg-white/5 border border-white/10 text-white px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-white/10 transition-colors text-center"
          >
            Demander une démo
          </Link>
        </div>
        <div className="relative w-full mt-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero.png"
            alt="Marchand utilisant Warko"
            className="w-full h-auto rounded-2xl"
          />
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-white/5 bg-white/[0.03] py-10">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-indigo-400">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Tout ce dont vous avez besoin pour réussir</h2>
          <p className="mt-3 text-gray-500 max-w-2xl mx-auto">
            Des outils professionnels conçus pour transformer votre commerce informel en une entreprise structurée et rentable.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Feature 1 — large card */}
          <div className="p-8 border border-white/5 bg-white/[0.03] rounded-2xl hover:border-indigo-500/30 transition-all flex flex-col">
            <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-indigo-500/10 text-2xl mb-5">📦</div>
            <h3 className="text-xl font-semibold text-white mb-2">Gestion de Stock Intelligente</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{FEATURES[0].desc}</p>
            <div className="mt-6 flex items-center gap-3 p-3 border border-amber-500/20 bg-amber-500/5 rounded-xl">
              <span className="text-amber-400 text-lg">⚠️</span>
              <div>
                <p className="text-xs font-semibold text-amber-300">Alerte Stock Bas</p>
                <p className="text-xs text-gray-500">iPhone 15 Pro — 2 restants</p>
              </div>
            </div>
          </div>

          {/* Image */}
          <div className="relative w-full min-h-[280px] rounded-2xl overflow-hidden border border-white/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/features.png"
              alt="Tableau de bord Warko"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Feature 2 */}
          <div className="p-8 border border-white/5 bg-white/[0.03] rounded-2xl hover:border-indigo-500/30 transition-all">
            <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-indigo-500/10 text-2xl mb-5">💳</div>
            <h3 className="text-xl font-semibold text-white mb-2">Suivi des Encaissements</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{FEATURES[1].desc}</p>
          </div>

          {/* Feature 3 */}
          <div className="p-8 border border-white/5 bg-white/[0.03] rounded-2xl hover:border-indigo-500/30 transition-all">
            <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-indigo-500/10 text-2xl mb-5">📈</div>
            <h3 className="text-xl font-semibold text-white mb-2">Analytique de Vente</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{FEATURES[2].desc}</p>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section id="comparaison" className="border-y border-white/5 bg-white/[0.02] py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white">Warko vs. Méthode manuelle</h2>
            <p className="mt-3 text-gray-500">Pourquoi les meilleurs marchands font le changement</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Before */}
            <div className="bg-white/[0.03] border border-red-500/20 rounded-2xl p-8">
              <div className="inline-flex items-center gap-2 bg-red-500/10 text-red-400 text-xs font-semibold px-3 py-1 rounded-full mb-6">
                ✕ Avant Warko
              </div>
              <div className="space-y-5">
                <div>
                  <h4 className="font-semibold text-white mb-1">Erreurs fréquentes</h4>
                  <p className="text-sm text-gray-500">Calculs manuels sur papier, erreurs de stock, clients qui attendent des heures pour une réponse.</p>
                </div>
                <div className="border-t border-white/5 pt-5">
                  <h4 className="font-semibold text-white mb-1">Gestion chronophage</h4>
                  <p className="text-sm text-gray-500">Passez 4 heures par jour à copier-coller des adresses de livraison et vérifier les paiements Mobile Money.</p>
                </div>
              </div>
            </div>
            {/* After */}
            <div className="bg-white/[0.03] border border-indigo-500/30 rounded-2xl p-8">
              <div className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-400 text-xs font-semibold px-3 py-1 rounded-full mb-6">
                ✓ Avec Warko
              </div>
              <div className="space-y-5">
                <div>
                  <h4 className="font-semibold text-white mb-1">Précision totale</h4>
                  <p className="text-sm text-gray-500">Automatisation complète, stock synchronisé, rapports de ventes précis, réponses instantanées.</p>
                </div>
                <div className="border-t border-white/5 pt-5">
                  <h4 className="font-semibold text-white mb-1">Efficacité maximale</h4>
                  <p className="text-sm text-gray-500">Générez factures et bons de livraison en 1 clic. Économisez 15 heures par semaine.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="impact" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white">Témoignages</h2>
          <p className="mt-3 text-gray-500">Ils ont fait confiance à Warko pour gérer leur commerce</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="bg-white/[0.03] border border-white/5 rounded-2xl p-6">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="text-indigo-400 text-sm">★</span>
                ))}
              </div>
              <p className="text-sm text-gray-400 leading-relaxed mb-5">&ldquo;{t.quote}&rdquo;</p>
              <div>
                <p className="font-semibold text-white text-sm">{t.name}</p>
                <p className="text-xs text-gray-600 mt-0.5">{t.business}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 overflow-hidden border-t border-white/5">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-64 bg-indigo-600/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white">
            Commencez à gérer votre commerce intelligemment
          </h2>
          <p className="mt-4 text-gray-400 text-lg">Essayez Warko aujourd&apos;hui</p>
          <Link
            href="/auth/login"
            className="inline-block mt-8 bg-indigo-600 text-white px-10 py-4 rounded-xl text-base font-bold hover:bg-indigo-500 transition-colors"
          >
            Créer mon compte →
          </Link>
          <p className="mt-4 text-gray-600 text-sm">Aucune carte bancaire requise</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <p>© {new Date().getFullYear()} Warko — Gestion commerciale pour commerçants africains</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-gray-400 transition-colors">Conditions</a>
            <a href="#" className="hover:text-gray-400 transition-colors">Confidentialité</a>
            <a href="#" className="hover:text-gray-400 transition-colors">Contact</a>
          </div>
          <div className="flex items-center gap-4">
            <span className="hover:text-gray-400 cursor-pointer transition-colors">TikTok</span>
            <span className="hover:text-gray-400 cursor-pointer transition-colors">Facebook</span>
            <span className="hover:text-gray-400 cursor-pointer transition-colors">Instagram</span>
            <span className="hover:text-gray-400 cursor-pointer transition-colors">WhatsApp</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
