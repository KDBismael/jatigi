import { SectionHeading } from "./section-heading";
import { ProblemPreview } from "./card-previews";
import s from "./landing.module.css";
const problems = [
  {
    key: "money",
    title: "De l’argent disparaît",
    text: "Un montant « oublié » par-ci, une commande mal notée par-là. Sans trace fiable, impossible de vérifier.",
  },
  {
    key: "disputes",
    title: "Des litiges tous les jours",
    text: "C’est votre parole contre celle du livreur. Chaque fin de journée devient une négociation.",
  },
  {
    key: "profit",
    title: "Vous ne connaissez pas votre vrai bénéfice",
    text: "Entre les frais de livraison, la pub et l’emballage, la fin du mois reste un mystère.",
  },
];
export function ProblemSection() {
  return (
    <section id="probleme" data-testid="section-problem" className={s.section}>
      <div className={s.wrap}>
        <SectionHeading
          eyebrow="Le problème"
          title="Le soir, c’est toujours la même histoire."
          description="Vos livreurs encaissent l’argent à votre place. Mais combien ont-ils encaissé, combien ont-ils gardé en frais, combien doivent-ils vous rendre ? Tout est noté dans un cahier, des vocaux WhatsApp ou un Excel jamais à jour. Quand c’est noté."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {problems.map((p) => (
            <article
              key={p.key}
              data-testid={`problem-card-${p.key}`}
              className={`${s.card} ${s.reveal} bg-white p-7`}
            >
              <ProblemPreview kind={p.key} />
              <h3 className="mb-3 text-lg font-bold leading-snug">{p.title}</h3>
              <p className="text-[15px] leading-relaxed text-[#545873]">
                {p.text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
