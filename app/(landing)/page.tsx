import Link from 'next/link'

const FEATURES = [
  {
    icon: '🛍️',
    title: 'Catalogue produits',
    desc: "Ajoutez vos produits avec coûts d'achat, importation, emballage. La marge est calculée instantanément.",
  },
  {
    icon: '📦',
    title: 'Gestion des commandes',
    desc: "Créez et suivez chaque commande par client, canal d'acquisition et statut en temps réel.",
  },
  {
    icon: '📊',
    title: 'Tableau de bord',
    desc: "Chiffre d'affaires, bénéfice net, commandes livrées — tout en un coup d'œil.",
  },
  {
    icon: '📈',
    title: 'Analyses de performance',
    desc: "Produits les plus vendus, canaux les plus rentables, évolution sur 30 jours.",
  },
  {
    icon: '👥',
    title: 'Gestion des accès',
    desc: "Vos employés voient les commandes. Vos marges et coûts restent invisibles pour eux.",
  },
  {
    icon: '📱',
    title: 'Multi-canal',
    desc: "TikTok, Facebook, Instagram, WhatsApp, Autre — sachez exactement d'où viennent vos ventes.",
  },
]

const CHANNELS = ['TikTok', 'Facebook', 'Instagram', 'WhatsApp', 'magasin physique']

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Nav */}
      <nav className="border-b border-white/5 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight">Jatigi</span>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm text-gray-400 hover:text-white transition-colors px-4 py-2"
            >
              Connexion
            </Link>
            <Link
              href="/auth/login"
              className="bg-white text-gray-950 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors"
            >
              Commencer gratuitement
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center relative">
        {/* Glow */}
        <div className="absolute inset-0 -top-20 flex items-start justify-center pointer-events-none">
          <div className="w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-2 border border-white/10 bg-white/5 text-gray-300 px-4 py-1.5 rounded-full text-sm font-medium mb-8 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Conçu pour les commerçants africains
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold leading-tight tracking-tight">
            Gérez votre commerce<br />
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              sur les réseaux sociaux
            </span>
          </h1>

          <p className="mt-6 text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Jatigi est la plateforme tout-en-un pour les vendeurs TikTok, Facebook, Instagram et WhatsApp.
            Commandes, marges, équipe — tout au même endroit.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/login"
              className="bg-indigo-600 text-white px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900"
            >
              Démarrer gratuitement →
            </Link>
            <a
              href="#features"
              className="border border-white/10 text-gray-300 px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-white/5 transition-colors"
            >
              Voir les fonctionnalités
            </a>
          </div>

          {/* Channel badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            <span className="text-xs text-gray-600 mr-2">Ventes sur</span>
            {CHANNELS.map((c) => (
              <span
                key={c}
                className="border border-white/10 bg-white/5 text-gray-400 text-xs px-3 py-1.5 rounded-full"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-white/5 bg-white/[0.02] py-10">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-3xl font-bold text-white">100%</p>
            <p className="text-sm text-gray-500 mt-1">Marges confidentielles</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-white">5</p>
            <p className="text-sm text-gray-500 mt-1">Canaux d&apos;acquisition</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-white">0 FCFA</p>
            <p className="text-sm text-gray-500 mt-1">Pour démarrer</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white">Tout ce dont vous avez besoin</h2>
          <p className="mt-3 text-gray-500">Un outil simple, taillé pour votre réalité</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group p-6 border border-white/5 bg-white/[0.03] rounded-2xl hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all"
            >
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Role section */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="border border-white/5 bg-white/[0.02] rounded-3xl p-10 grid md:grid-cols-2 gap-8">
          <div>
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-400 text-xs font-semibold px-3 py-1 rounded-full mb-4">
              ADMINISTRATEUR
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Contrôle total</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              {['Catalogue produits & coûts', 'Marges & bénéfices', 'Tableau de bord financier', 'Analyses & canaux', 'Gestion des employés'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-indigo-400">✓</span> {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="inline-flex items-center gap-2 bg-gray-500/10 text-gray-400 text-xs font-semibold px-3 py-1 rounded-full mb-4">
              EMPLOYÉ
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Accès ciblé</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              {['Créer des commandes', 'Modifier le statut', 'Consulter les commandes'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> {item}
                </li>
              ))}
              {['Coûts & marges', 'Statistiques financières'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-red-500">✕</span>
                  <span className="line-through opacity-50">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-64 bg-indigo-700/20 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white">
            Prêt à prendre le contrôle ?
          </h2>
          <p className="mt-4 text-gray-400 text-lg">
            Rejoignez Jatigi et gérez vos ventes avec clarté.
          </p>
          <Link
            href="/auth/login"
            className="inline-block mt-8 bg-white text-gray-950 px-10 py-4 rounded-xl text-base font-bold hover:bg-gray-100 transition-colors"
          >
            Créer mon compte gratuitement →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-sm text-gray-700">
        © {new Date().getFullYear()} Jatigi — Gestion commerciale pour commerçants africains
      </footer>
    </div>
  )
}
