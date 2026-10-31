import Link from "next/link";
import { BrandMark } from "./landing-icons";
import s from "./landing.module.css";
export function LandingNav() {
  return (
    <header
      data-testid="landing-nav"
      className="sticky top-0 z-40 border-b border-[#2a2d4f] bg-[#0e1020] text-white"
    >
      <nav
        className={`${s.wrap} flex min-h-[68px] items-center justify-between gap-3`}
        aria-label="Navigation principale"
      >
        <Link
          prefetch={false}
          href="/"
          data-testid="nav-logo"
          aria-label="Warko, accueil"
          className={`${s.heading} flex items-center gap-2.5 text-[22px] font-extrabold tracking-tight`}
        >
          <BrandMark />
          Warko
        </Link>
        <div className="hidden items-center gap-7 text-sm text-[#c4c6dd] md:flex">
          {[
            ["product", "produit", "Le produit"],
            ["features", "fonctionnalites", "Fonctionnalités"],
            ["pricing", "tarifs", "Tarifs"],
            ["faq", "faq", "FAQ"],
          ].map(([key, id, label]) => (
            <a
              className={s.navLink}
              key={key}
              href={`#${id}`}
              data-testid={`nav-link-${key}`}
              data-track={`nav_${key}`}
            >
              {label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link
            prefetch={false}
            href="/auth/login"
            className={`${s.navLink} text-xs sm:text-sm`}
            data-testid="nav-login"
            data-track="nav_login"
          >
            Se connecter
          </Link>
          <Link
            prefetch={false}
            href="/auth/signup"
            className={`${s.button} !min-h-11 !rounded-xl bg-white !px-4 !text-sm text-[#0e1020]`}
            data-testid="nav-signup"
            data-track="cta_signup"
            data-track-location="nav"
          >
            Essayer
          </Link>
        </div>
      </nav>
    </header>
  );
}
