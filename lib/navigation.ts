import type { Role } from "@/lib/constants";
import type { IconName } from "@/components/ui/icon";
export interface NavigationItem {
  href: string;
  label: string;
  short: string;
  icon: IconName;
  roles: readonly Role[];
  group?: "Pilotage" | "Boutique" | "Aide";
  primary?: boolean;
}
const all: readonly Role[] = ["admin", "employee", "manager"];
export const NAVIGATION: readonly NavigationItem[] = [
  {
    href: "/dashboard",
    label: "Tableau de bord",
    short: "Tableau",
    icon: "dashboard",
    roles: ["admin"],
    primary: true,
  },
  {
    href: "/orders",
    label: "Commandes",
    short: "Commandes",
    icon: "cart",
    roles: all,
    primary: true,
  },
  {
    href: "/deliveries",
    label: "Livraisons",
    short: "Livraisons",
    icon: "truck",
    roles: ["admin", "manager"],
    primary: true,
  },
  {
    href: "/products",
    label: "Produits",
    short: "Produits",
    icon: "box",
    roles: ["admin"],
    primary: true,
  },
  {
    href: "/analytics",
    label: "Analyses",
    short: "Analyses",
    icon: "chart",
    roles: ["admin"],
    group: "Pilotage",
  },
  {
    href: "/expenses",
    label: "Dépenses",
    short: "Dépenses",
    icon: "receipt",
    roles: ["admin"],
    group: "Pilotage",
  },
  {
    href: "/pilotage",
    label: "Objectifs & lives",
    short: "Objectifs",
    icon: "target",
    roles: ["admin"],
    group: "Pilotage",
  },
  {
    href: "/reports",
    label: "Bilans mensuels",
    short: "Bilans",
    icon: "report",
    roles: ["admin"],
    group: "Pilotage",
  },
  {
    href: "/team",
    label: "Équipe",
    short: "Équipe",
    icon: "users",
    roles: ["admin"],
    group: "Boutique",
  },
  {
    href: "/subscription",
    label: "Abonnement",
    short: "Abonnement",
    icon: "credit-card",
    roles: ["admin"],
    group: "Boutique",
  },
  {
    href: "/account",
    label: "Mon compte",
    short: "Compte",
    icon: "user",
    roles: all,
    group: "Boutique",
  },
  {
    href: "/support",
    label: "Support",
    short: "Support",
    icon: "support",
    roles: all,
    group: "Aide",
  },
];
export function navigationFor(role: Role | null): readonly NavigationItem[] {
  return role ? NAVIGATION.filter((item) => item.roles.includes(role)) : [];
}
export function isNavigationActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}
export function bottomNavigationFor(
  role: Role | null,
): readonly NavigationItem[] {
  return role
    ? [
        ...navigationFor(role).filter((item) => item.primary),
        {
          href: "/more",
          label: "Plus",
          short: "Plus",
          icon: "menu",
          roles: all,
        },
      ]
    : [];
}
export function isBottomNavigationActive(
  pathname: string,
  item: NavigationItem,
  role: Role | null,
) {
  return item.href === "/more"
    ? isNavigationActive(pathname, "/more") ||
        navigationFor(role).some(
          (n) => !n.primary && isNavigationActive(pathname, n.href),
        )
    : isNavigationActive(pathname, item.href);
}
