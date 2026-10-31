"use client";
import { useState } from "react";
import { PLANS } from "@/lib/billing/plans";
import { SectionHeading } from "./section-heading";
import { LandingIcon } from "./landing-icons";
import s from "./landing.module.css";
const limit = PLANS.discovery.ordersPerMonth;
const questions = [
  [
    "Faut-il installer une application ?",
    "Non. Warko fonctionne directement dans le navigateur de votre téléphone, de votre tablette ou de votre ordinateur. Il suffit de créer un compte.",
  ],
  [
    "Le plan Découverte est-il vraiment gratuit ?",
    `Oui, sans carte bancaire et sans limite de durée. Vous pouvez saisir ${limit} commandes par mois, suivre 1 livreur, voir votre tableau de bord et enregistrer vos dépenses. C’est un vrai outil, pas une démo.`,
  ],
  [
    `Que se passe-t-il quand j’atteins ${limit} commandes dans le mois ?`,
    `Vous êtes prévenu dès ${limit - 5} commandes. À ${limit}, vos commandes existantes restent accessibles et modifiables : seule la création de nouvelles commandes est mise en pause jusqu’au 1er du mois suivant, ou jusqu’à votre passage au plan Pro.`,
  ],
  [
    "Comment payer mon abonnement ?",
    "Avec Wave, Orange Money, MTN MoMo ou Moov Money, directement depuis votre téléphone. La carte Visa ou Mastercard est aussi acceptée. Votre nouveau plan s’active dès que le paiement est confirmé.",
  ],
  [
    "Mon responsable livraisons peut-il voir mes marges ?",
    "Non. Il voit uniquement les commandes en livraison, les livreurs et leurs soldes, et le bilan quotidien. Il peut mettre à jour les statuts et enregistrer les reversements, mais il ne voit ni vos produits, ni vos prix d’achat, ni vos dépenses, ni votre chiffre d’affaires.",
  ],
  [
    "Je n’ai pas encore de livreur. Warko est-il utile pour moi ?",
    "Oui. Vous pouvez gérer vos commandes, votre stock, vos dépenses et voir votre bénéfice réel. Le jour où vous confiez vos premières livraisons, le suivi des livreurs est déjà prêt.",
  ],
  [
    "Et si un paiement de renouvellement échoue ?",
    "Vous êtes prévenu 3 jours avant chaque échéance. En cas d’échec, vous avez 3 jours de grâce avec un rappel par jour. Ensuite, votre compte repasse au plan Découverte : vos données sont conservées.",
  ],
  [
    "Puis-je changer de plan ou annuler ?",
    "Oui, à tout moment depuis la page Abonnement : passer au plan supérieur, redescendre ou annuler. Vos données restent à vous.",
  ],
];
export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section
      id="faq"
      data-testid="section-faq"
      className={`${s.section} border-t border-[#e4e4ee] bg-white`}
    >
      <div className={`${s.wrap} !max-w-[860px]`}>
        <SectionHeading
          eyebrow="Questions fréquentes"
          title="Vous vous demandez sûrement…"
        />
        <div className="border-t border-[#e4e4ee]">
          {questions.map(([q, a], i) => (
            <div
              key={q}
              data-testid={`faq-item-${i}`}
              className="border-b border-[#e4e4ee]"
            >
              <h3>
                <button
                  type="button"
                  id={`faq-btn-${i}`}
                  data-testid={`faq-toggle-${i}`}
                  data-track="faq_open"
                  aria-expanded={open === i}
                  aria-controls={`faq-panel-${i}`}
                  onClick={() => setOpen(open === i ? null : i)}
                  className={`flex min-h-16 w-full items-center justify-between gap-4 py-[18px] text-left text-[17px] font-semibold ${open === i ? "text-[#4338ca]" : ""}`}
                >
                  <span>{q}</span>
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${open === i ? "bg-[#4f46e5] text-white" : "bg-[#eef0ff] text-[#4f46e5]"}`}
                  >
                    <LandingIcon
                      name="chevron"
                      width={18}
                      height={18}
                      className={`transition-transform ${open === i ? "rotate-180" : ""}`}
                    />
                  </span>
                </button>
              </h3>
              {open === i && (
                <div
                  id={`faq-panel-${i}`}
                  data-testid={`faq-answer-${i}`}
                  role="region"
                  aria-labelledby={`faq-btn-${i}`}
                  className={`${s.fade} pb-5 pr-8 text-base leading-relaxed text-[#545873]`}
                >
                  {a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
