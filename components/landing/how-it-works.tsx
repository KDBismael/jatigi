import { SectionHeading } from "./section-heading";
import s from "./landing.module.css";
const steps = [
  [
    "Ajoutez vos produits",
    "Nom, prix et stock. Les variantes et les lots si vous en avez.",
  ],
  [
    "Ajoutez vos livreurs",
    "Un nom, un numéro, les frais de livraison. C’est tout.",
  ],
  [
    "Saisissez vos commandes",
    "Client, produits, adresse, livreur assigné. Le stock se met à jour seul.",
  ],
  [
    "Le soir, vous savez",
    "Qui doit combien, qui a reversé, et ce qu’il reste à réclamer. En un coup d’œil.",
  ],
];
export function HowItWorks() {
  return (
    <section
      id="comment-ca-marche"
      data-testid="section-how-it-works"
      className={`${s.section} bg-[#0e1020] text-white`}
    >
      <div className={s.wrap}>
        <SectionHeading
          dark
          eyebrow="Comment ça marche"
          title="Prêt en moins de 5 minutes."
          description="Un assistant vous guide pas à pas. Ce que vous créez est réel et utilisable tout de suite, pas une démo."
        />
        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map(([title, text], i) => (
            <li
              key={title}
              data-testid={`step-${i + 1}`}
              className={`${s.card} ${s.reveal} flex flex-col gap-3 !border-[#2a2d4f] p-6 ${i === 3 ? "bg-[#4f46e5]" : "bg-[#171a33]"}`}
            >
              <span
                className={`${s.heading} text-[44px] font-extrabold ${i === 3 ? "text-white" : "text-[#a5b4fc]"}`}
              >
                {i + 1}
              </span>
              <h3 className="text-lg font-bold">{title}</h3>
              <p
                className={`text-sm leading-relaxed ${i === 3 ? "text-[#e0e7ff]" : "text-[#b9bdd8]"}`}
              >
                {text}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
