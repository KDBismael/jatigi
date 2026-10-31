import { SectionHeading } from "./section-heading";
import s from "./landing.module.css";
const solutions = [
  [
    "riders",
    "Je ne sais pas combien mon livreur me doit.",
    <>
      Warko calcule <b>en temps réel</b> le solde de chaque livreur : montant
      encaissé, frais retenus, somme due, avec un bilan quotidien.
    </>,
  ],
  [
    "orders",
    "Je perds des commandes entre le cahier et WhatsApp.",
    <>
      Toutes vos commandes au même endroit avec leur statut,{" "}
      <b>quel que soit le canal de vente</b>.
    </>,
  ],
  [
    "profit",
    "Je ne sais pas si je gagne ou si je perds de l’argent.",
    <>
      Le tableau de bord calcule chiffre d’affaires, dépenses, frais de
      livraison et <b>bénéfice net réel</b>.
    </>,
  ],
  [
    "stock",
    "Mes stocks sont approximatifs.",
    <>
      Chaque commande <b>ajuste le stock automatiquement</b>, avec gestion des
      lots et des variantes.
    </>,
  ],
  [
    "team",
    "Mon équipe n’a pas la bonne info au bon moment.",
    <>
      Chaque collaborateur a <b>un rôle dédié</b> et n’accède qu’à ce qui le
      concerne.
    </>,
  ],
] as const;
export function SolutionSection() {
  return (
    <section
      id="solution"
      data-testid="section-solution"
      className={`${s.section} border-t border-[#e4e4ee] bg-white`}
    >
      <div className={s.wrap}>
        <SectionHeading
          eyebrow="La solution"
          title="Ce que Warko règle concrètement."
        />
        <div className="space-y-3">
          {solutions.map(([key, q, a]) => (
            <div
              key={key}
              data-testid={`solution-row-${key}`}
              className={`${s.card} ${s.reveal} grid gap-3 p-5 md:grid-cols-[1fr_1.2fr] md:items-center md:gap-6`}
            >
              <p className="text-[17px] font-medium text-[#545873]">« {q} »</p>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-[#4f46e5]">
                  Avec Warko
                </span>
                <p className="text-[15px] leading-relaxed">{a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
