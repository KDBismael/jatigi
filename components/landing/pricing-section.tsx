"use client";
import {HAS_CUSTOM_BILLING_PRICES} from "@/lib/billing/pricing";
import { TEST_BILLING_PRICES } from "@/lib/billing/test-pricing";
import { useState } from "react";
import Link from "next/link";
import { PLANS, ANNUAL_SAVING_PERCENT, type BillingCycle } from "@/lib/billing/plans";
import { formatAmount } from "@/lib/utils";
import { LandingIcon } from "./landing-icons";
import { SectionHeading } from "./section-heading";
import s from "./landing.module.css";
export function PricingSection() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const annual = cycle === "yearly";
  return (
    <section id="tarifs" data-testid="section-pricing" className={s.section}>
      <div className={s.wrap}>
        <div className="mx-auto max-w-3xl text-center">
          <SectionHeading
            eyebrow="Tarifs"
            title="Commencez gratuitement. Passez au Pro quand vous grandissez."
          />
          <p className="-mt-4 text-base text-[#545873]">
            Le prix suit votre nombre de livreurs. Sans engagement.
          </p>
        </div>
        <div
          data-testid="pricing-toggle"
          role="group"
          aria-label="Périodicité des tarifs"
          className="relative mx-auto my-9 grid w-full max-w-[320px] grid-cols-2 rounded-full border border-[#e4e4ee] bg-white p-1"
        >
          <span
            aria-hidden="true"
            className="absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full bg-[#12142a] transition-transform duration-300"
            style={{ transform: annual ? "translateX(100%)" : "translateX(0)" }}
          />
          {(["monthly", "yearly"] as const).map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={value === cycle}
              onClick={() => setCycle(value)}
              data-testid={`pricing-toggle-${value === "monthly" ? "monthly" : "annual"}`}
              data-track={`pricing_toggle_${value === "monthly" ? "monthly" : "annual"}`}
              className={`relative min-h-12 rounded-full text-sm font-semibold ${cycle === value ? "text-white" : "text-[#3b3f5c]"}`}
            >
              {value === "monthly" ? "Mensuel" : "Annuel"}
              {value === "yearly" && !TEST_BILLING_PRICES && ANNUAL_SAVING_PERCENT>0 && (
                <span
                  className={`ml-2 text-[11px] ${annual ? "text-[#fbbf24]" : "text-[#166534]"}`}
                >
                  −{ANNUAL_SAVING_PERCENT} %
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {Object.values(PLANS).map((plan) => {
            const pro = plan.id === "pro",
              key = plan.id === "discovery" ? "decouverte" : plan.id;
            const compare =
              "launchCompareAt" in plan ? plan.launchCompareAt[cycle] : null;
            const driverLabel =
              plan.drivers === null
                ? "Livreurs illimités"
                : `${plan.drivers} livreur${plan.drivers === 1 ? "" : "s"}`;
            const userLabel =
              plan.users === null
                ? "Utilisateurs illimités"
                : plan.id === "discovery"
                  ? `${plan.users} utilisateur (vous)`
                  : `${plan.users} utilisateurs (vous + ${plan.users - 1})`;
            const list =
              plan.id === "discovery"
                ? [
                    driverLabel,
                    `${plan.ordersPerMonth} commandes / mois`,
                    userLabel,
                    "Bilan livreur basique (solde global)",
                    "Support : FAQ",
                  ]
                : [
                    driverLabel,
                    "Commandes illimitées",
                    userLabel,
                    plan.id === "pro"
                      ? "Bilan détaillé par livreur + export"
                      : "Bilan détaillé + historique complet",
                    plan.id === "pro"
                      ? "Support e-mail + WhatsApp (48 h)"
                      : "Support WhatsApp prioritaire (24 h)",
                  ];
            return (
              <article
                key={plan.id}
                data-testid={`pricing-plan-${key}`}
                data-plan={key}
                className={`${s.card} ${s.reveal} relative flex flex-col gap-5 !rounded-[20px] p-7 ${pro ? "order-first !border-[#4f46e5] bg-[#0e1020] text-white lg:order-none" : "bg-white"}`}
              >
                {pro && (
                  <span className="absolute -top-3 left-6 rounded-full bg-[#fbbf24] px-3 py-1 text-xs font-bold text-[#12142a]">
                    Recommandé
                  </span>
                )}
                <div>
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <p
                    className={`mt-1 text-sm ${pro ? "text-[#b9bdd8]" : "text-[#545873]"}`}
                  >
                    {plan.id === "discovery"
                      ? "Pour démarrer et prendre de bonnes habitudes."
                      : pro
                        ? "Pour les vendeurs avec plusieurs livreurs."
                        : "Pour les boutiques qui tournent à plein régime."}
                  </p>
                </div>
                <div key={cycle} className={`${s.fade} min-h-[84px]`}>
                  <div className="flex flex-wrap items-baseline gap-2">
                    {compare && (
                      <s
                        className={`text-base ${pro ? "text-[#b9bdd8]" : "text-[#6b6f88]"}`}
                      >
                        {formatAmount(compare)}
                      </s>
                    )}
                    <strong
                      data-testid={
                        plan.id !== "discovery"
                          ? `pricing-price-${plan.id}`
                          : undefined
                      }
                      className={`${s.heading} text-[44px] font-extrabold leading-tight`}
                    >
                      {formatAmount(plan[cycle])}
                    </strong>
                    <span
                      className={`text-sm font-semibold ${pro ? "text-[#c7c9df]" : "text-[#545873]"}`}
                    >
                      FCFA
                      {plan.id !== "discovery" &&
                        ` / ${annual ? "an" : "mois"}`}
                    </span>
                  </div>
                  {plan.id !== "discovery" && (
                    <p
                      className={`mt-1 text-[13px] font-semibold ${pro ? "text-[#fbbf24]" : "text-[#b45309]"}`}
                    >
                      {annual
                        ? `Soit ${formatAmount(plan.yearly / 12)} FCFA/mois${plan.monthly*12>plan.yearly?` · Économisez ${formatAmount(plan.monthly*12-plan.yearly)} FCFA`:""}`
                        : HAS_CUSTOM_BILLING_PRICES ? "Facturation mensuelle" : "Prix de lancement"}
                    </p>
                  )}
                  {plan.id === "discovery" && (
                    <p className="mt-1 text-[13px] text-[#545873]">
                      Gratuit, pour toujours.
                    </p>
                  )}
                </div>
                <Link
                  prefetch={false}
                  href={`/auth/signup?plan=${key}&cycle=${cycle}`}
                  data-testid={`pricing-cta-${key}`}
                  data-track="cta_signup"
                  data-track-location="pricing"
                  data-plan={key}
                  className={`${s.button} ${pro ? s.primary : "border-[1.5px] border-[#12142a] text-[#12142a] hover:bg-[#12142a] hover:text-white"} w-full`}
                >
                  Essayer gratuitement
                </Link>
                <ul className="space-y-3 text-[15px]">
                  {list.map((text) => (
                    <li key={text} className="flex items-start gap-2.5">
                      <LandingIcon
                        name="check"
                        width={20}
                        height={20}
                        className={pro ? "text-[#a5b4fc]" : "text-[#4f46e5]"}
                      />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
        <div
          data-testid="pricing-payment-methods"
          className="mt-10 space-y-4 text-center"
        >
          <p className="text-sm font-semibold text-[#3b3f5c]">
            Payez depuis votre téléphone, en moins de 2 minutes
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              "Wave",
              "Orange Money",
              "MTN MoMo",
              "Moov Money",
              "Visa / Mastercard",
            ].map((name) => (
              <span
                key={name}
                className="rounded-xl border border-[#e4e4ee] bg-white px-3 py-2 text-sm font-semibold"
              >
                {name}
              </span>
            ))}
          </div>
          <p className="text-[13px] text-[#545873]">
            Sessions live, tableau de bord, catalogue, stock et dépenses inclus
            dans tous les plans. Pas de virement, pas d’IBAN. Annulable à tout
            moment, vos données restent à vous.
          </p>
        </div>
      </div>
    </section>
  );
}
