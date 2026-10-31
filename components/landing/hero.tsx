import Link from "next/link";
import { PLANS } from "@/lib/billing/plans";
import { HeroDemo } from "./hero-demo";
import { LandingIcon } from "./landing-icons";
import s from "./landing.module.css";
export function Hero() {
  return (
    <section
      id="hero"
      data-testid="section-hero"
      className="bg-[#0e1020] pt-12 pb-[88px] text-white"
    >
      <div
        className={`${s.wrap} grid min-w-0 items-center gap-12 lg:grid-cols-[1.1fr_.9fr] lg:gap-14`}
      >
        <div className="flex min-w-0 flex-col gap-6">
          <p
            className={`${s.enter} inline-flex w-fit items-center gap-2 rounded-full border border-[#34386a] bg-[#171a33] py-1.5 pr-3 pl-2 text-[13px] font-medium text-[#c7cae6]`}
          >
            <span className={`${s.ping} h-2 w-2 rounded-full bg-[#34d399]`} />
            Pour les vendeurs WhatsApp, Facebook, Instagram et TikTok
          </p>
          <h1
            data-testid="hero-headline"
            className={`${s.enter} ${s.delay1} text-[40px] font-extrabold leading-[1.04] md:text-[54px] lg:text-[66px]`}
          >
            Vous savez combien vos livreurs vous doivent{" "}
            <span className="text-[#fbbf24]">ce soir&nbsp;?</span>
          </h1>
          <p
            data-testid="hero-subheadline"
            className={`${s.enter} ${s.delay2} max-w-xl text-[17px] leading-relaxed text-[#bfc2d9] md:text-[19px]`}
          >
            Warko calcule en temps réel ce que chaque livreur a encaissé, ce
            qu’il a gardé en frais et ce qu’il doit vous reverser. Vos
            commandes, votre stock et votre bénéfice au même endroit. Fini le
            cahier.
          </p>
          <div
            className={`${s.enter} ${s.delay3} flex flex-col gap-3 md:flex-row`}
          >
            <Link
              prefetch={false}
              href="/auth/signup"
              data-testid="cta-hero-signup"
              data-track="cta_signup"
              data-track-location="hero"
              className={`${s.button} ${s.primary}`}
            >
              Essayer gratuitement <LandingIcon name="arrow" />
            </Link>
            <a
              href="#produit"
              data-testid="cta-hero-product"
              data-track="cta_see_product"
              data-track-location="hero"
              className={`${s.button} ${s.outline}`}
            >
              Voir l’application
            </a>
          </div>
          <ul
            data-testid="hero-reassurance"
            className={`${s.enter} ${s.delay4} space-y-3 text-[13px] text-[#bfc2d9]`}
          >
            {[
              `Gratuit jusqu’à ${PLANS.discovery.ordersPerMonth} commandes/mois`,
              "Aucune carte requise",
              "Rien à installer, ça marche sur votre téléphone",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2">
                {t}
              </li>
            ))}
          </ul>
        </div>
        <HeroDemo />
      </div>
    </section>
  );
}
