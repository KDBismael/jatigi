import Link from "next/link";
import { PLANS } from "@/lib/billing/plans";
import s from "./landing.module.css";
export function StickyMobileCta() {
  return (
    <div
      data-testid="sticky-mobile-cta"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[#e4e4ee] bg-white px-4 pt-3 shadow-[0_-8px_30px_#0e102010] md:hidden"
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold">Gratuit</p>
          <p className="text-xs text-[#545873]">
            {PLANS.discovery.ordersPerMonth} commandes/mois
          </p>
        </div>
        <Link
          prefetch={false}
          href="/auth/signup"
          data-testid="cta-sticky-signup"
          data-track="cta_signup"
          data-track-location="sticky_mobile"
          className={`${s.button} ${s.primary} !min-h-12 !px-4 !text-sm`}
        >
          Essayer gratuitement
        </Link>
      </div>
    </div>
  );
}
