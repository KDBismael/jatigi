import { PLANS } from "@/lib/billing/plans";
import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
const heading = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
  variable: "--font-bricolage",
});
const body = Inter({
  subsets: ["latin"],
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
