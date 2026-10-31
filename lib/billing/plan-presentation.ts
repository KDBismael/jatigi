import { PLANS, type PlanId } from "./plans";
export const COMMON_PLAN_FEATURES = [
  "Sessions live",
  "Catalogue, stock et dépenses",
] as const;
export function planFeatures(id: PlanId): string[] {
  const p = PLANS[id];
  return [
    p.ordersPerMonth === null
      ? "Commandes illimitées"
      : `${p.ordersPerMonth} commandes par mois`,
    p.drivers === null
      ? "Livreurs illimités"
      : `${p.drivers} livreur${p.drivers === 1 ? "" : "s"}`,
    p.users === null
      ? "Utilisateurs illimités"
      : `${p.users} utilisateur${p.users === 1 ? "" : "s"}`,
    p.dailyBalance
      ? "Bilan détaillé par livreur et export"
      : "Solde global des livreurs",
    p.historyDays === null
      ? "Historique complet"
      : p.historyDays
        ? `Historique : ${p.historyDays} jours`
        : "Bilan basique",
    id === "discovery"
      ? "Support FAQ"
      : id === "pro"
        ? "Email et WhatsApp sous 48 h"
        : "WhatsApp prioritaire sous 24 h",
  ];
}
