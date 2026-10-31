import Link from "next/link";
import { PLANS } from "@/lib/billing/plans";
import { LandingIcon } from "./landing-icons";
import s from "./landing.module.css";
export function FinalCta() {
  return (
    <section
      id="cta-final"
      data-testid="section-final-cta"
      className={`${s.section} bg-[#4f46e5] text-center text-white`}
    >
      <div
        className={`${s.wrap} flex max-w-[900px] flex-col items-center gap-6`}
      >
        <h2 className={`${s.title} ${s.reveal}`}>
          Ce soir, sachez exactement qui vous doit quoi.
        </h2>
        <p className="text-lg text-[#e0e7ff]">
          Créez votre boutique en 60 secondes. Gratuit jusqu’à{" "}
          {PLANS.discovery.ordersPerMonth} commandes par mois.
        </p>
        <Link
          prefetch={false}
          href="/auth/signup"
          data-testid="cta-final-signup"
          data-track="cta_signup"
          data-track-location="footer"
          className={`${s.button} bg-white text-[#4338ca]`}
        >
          Essayer gratuitement
          <LandingIcon name="arrow" />
        </Link>
        <p className="text-sm text-[#e0e7ff]">Aucune carte requise</p>
      </div>
    </section>
  );
}
