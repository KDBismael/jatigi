import { FeaturePreview } from "./card-previews";
import { SectionHeading } from "./section-heading";
import s from "./landing.module.css";
const features = [
  [
    "orders",
    "Commandes centralisées",
    "Filtrez par période, statut ou livreur. Suivez chaque commande de la réception au retour.",
  ],
  [
    "riders",
    "Reversements tracés",
    "Chaque reversement garde la date, le montant et qui l’a saisi. Impossible de saisir plus que le solde dû.",
  ],
  [
    "stock",
    "Stock automatique",
    "Lots, variantes, mouvements : entrées, sorties commande et retours tracés.",
  ],
  [
    "live",
    "Objectifs & sessions live",
    "Fixez un objectif de CA par live, saisissez vite pendant la diffusion, récap à la clôture.",
  ],
  [
    "expenses",
    "Dépenses & bilans mensuels",
    "Transport, emballage, publicité : classées par catégorie, avec un bilan clair chaque mois.",
  ],
  [
    "print",
    "Bons & exports",
    "Bon de commande en A4 ou ticket thermique, exports Excel et Google Sheets.",
  ],
];
export function FeaturesSection() {
  return (
    <section
      id="fonctionnalites"
      data-testid="section-features"
      className={`${s.section} border-t border-[#e4e4ee]`}
    >
      <div className={s.wrap}>
        <SectionHeading
          eyebrow="Fonctionnalités"
          title="Tout ce qu’il faut, de la commande à l’encaissement."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map(([key, title, text]) => (
            <article
              key={key}
              data-testid={`feature-${key}`}
              className={`${s.card} ${s.reveal} bg-white p-7`}
            >
              <FeaturePreview kind={key} />
              <h3 className="mb-3 text-lg font-bold">{title}</h3>
              <p className="text-sm leading-relaxed text-[#545873]">{text}</p>
            </article>
          ))}
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <article
            data-testid="feature-roles"
            className={`${s.card} ${s.reveal} !border-[#0e1020] bg-[#0e1020] p-7 text-white`}
          >
            <h3 className="mb-3 text-lg font-bold">
              Déléguez sans tout montrer.
            </h3>
            <p className="text-[15px] leading-relaxed text-[#b9bdd8]">
              Votre responsable livraisons gère les statuts et les reversements.
              Il ne voit ni vos marges, ni vos prix d’achat, ni votre chiffre
              d’affaires.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                "Propriétaire",
                "Gestionnaire commandes",
                "Responsable livraisons",
              ].map((t) => (
                <span
                  className="rounded-xl border border-[#34386a] px-3 py-2 text-xs"
                  key={t}
                >
                  {t}
                </span>
              ))}
            </div>
          </article>
          <article
            data-testid="feature-mobile"
            className={`${s.card} ${s.reveal} bg-white p-7`}
          >
            <h3 className="mb-3 text-lg font-bold">
              Pensé pour votre téléphone.
            </h3>
            <p className="text-[15px] leading-relaxed text-[#545873]">
              Warko s’ouvre dans le navigateur de votre smartphone, même
              d’entrée de gamme et en 4G. Rien à télécharger, mode sombre
              inclus, vos données vous suivent partout.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
