import { PLANS } from "@/lib/billing/plans";
import type { Metadata } from "next";
import localFont from "next/font/local";
const heading = localFont({
  src: "../../assets/fonts/BricolageGrotesque-Latin.woff2",
  weight: "700 800",
  display: "swap",
  variable: "--font-bricolage",
});
const body = localFont({
  src: "../../assets/fonts/Inter-Latin.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-landing-inter",
});
export const metadata: Metadata = {
  title: "Warko · Sachez ce que vos livreurs vous doivent",
  description: `Vos commandes, votre stock et les reversements de vos livreurs au même endroit. Commencez gratuitement avec ${PLANS.discovery.ordersPerMonth} commandes par mois.`,
};
export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${heading.variable} ${body.variable}`}>{children}</div>
  );
}
