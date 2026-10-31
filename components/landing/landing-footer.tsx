import Link from "next/link";
import s from "./landing.module.css";
export function LandingFooter() {
  return (
    <footer
      data-testid="landing-footer"
      className="bg-[#0e1020] py-10 text-white"
    >
      <div className={`${s.wrap} flex flex-col gap-8`}>
        <div className="flex flex-wrap items-center justify-between gap-5">
          <Link href="/" className={`${s.heading} text-2xl font-extrabold`}>
            Warko
          </Link>
          <nav
            aria-label="Navigation de pied de page"
            className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[#b9bdd8]"
          >
            {[
              ["produit", "Le produit"],
              ["fonctionnalites", "Fonctionnalités"],
              ["tarifs", "Tarifs"],
              ["faq", "FAQ"],
            ].map(([id, label]) => (
              <a key={id} href={`#${id}`} className={s.navLink}>
                {label}
              </a>
            ))}
            <Link
              prefetch={false}
              href="/auth/login"
              data-testid="footer-login"
              className={s.navLink}
            >
              Se connecter
            </Link>
            <Link href="/conditions" className={s.navLink}>Conditions</Link>
            <Link href="/confidentialite" className={s.navLink}>Confidentialité</Link>
            <Link href="/contact" className={s.navLink}>Contact</Link>
          </nav>
        </div>
        <p className="border-t border-[#2a2d4f] pt-6 text-xs leading-relaxed text-[#a1a5c4]">
          © {new Date().getUTCFullYear()} Warko · La gestion des paiements à la livraison pour les
          vendeurs des réseaux sociaux.
        </p>
      </div>
    </footer>
  );
}
