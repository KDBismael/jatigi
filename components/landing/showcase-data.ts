import type { Channel, OrderStatus } from "@/lib/constants";
export const SHOWCASE_ORDERS: {
  client: string;
  phone: string;
  channel: Channel;
  products: string;
  amount: number;
  driver: string;
  status: OrderStatus;
}[] = [
  {
    client: "Aïcha K.",
    phone: "07 08 •• •• 12",
    channel: "tiktok",
    products: "Sérum éclat × 2",
    amount: 18000,
    driver: "Koffi",
    status: "delivered",
  },
  {
    client: "Mariam D.",
    phone: "05 44 •• •• 90",
    channel: "whatsapp",
    products: 'Perruque lisse 16" × 1',
    amount: 35000,
    driver: "Koffi",
    status: "in_progress",
  },
  {
    client: "Jean-Marc T.",
    phone: "01 02 •• •• 37",
    channel: "facebook",
    products: "Crème corps × 3",
    amount: 13500,
    driver: "Non assigné",
    status: "confirmed",
  },
  {
    client: "Fatim B.",
    phone: "07 77 •• •• 05",
    channel: "instagram",
    products: "Kit soin cheveux × 1",
    amount: 22000,
    driver: "Non assigné",
    status: "received",
  },
  {
    client: "Awa S.",
    phone: "05 60 •• •• 48",
    channel: "tiktok",
    products: "Huile de ricin × 2",
    amount: 8000,
    driver: "Non assigné",
    status: "postponed",
  },
  {
    client: "Nadia O.",
    phone: "07 19 •• •• 61",
    channel: "magasin",
    products: "Gel douche × 4",
    amount: 12000,
    driver: "Ibrahim",
    status: "delivered",
  },
];
export const SHOWCASE_DRIVERS = [
  {
    key: "koffi",
    name: "Koffi",
    delivered: 7,
    progress: 1,
    cancelled: 0,
    postponed: 0,
    collected: 96000,
    fees: 8000,
    remitted: 60000,
    due: 28000,
    orders: [SHOWCASE_ORDERS[0], SHOWCASE_ORDERS[1]],
  },
  {
    key: "ibrahim",
    name: "Ibrahim",
    delivered: 4,
    progress: 0,
    cancelled: 1,
    postponed: 0,
    collected: 57000,
    fees: 5000,
    remitted: 37500,
    due: 14500,
    orders: [
      SHOWCASE_ORDERS[5],
      {
        client: "Koné A.",
        phone: "01 53 •• •• 22",
        channel: "whatsapp" as Channel,
        products: "Savon noir × 2",
        amount: 0,
        driver: "Ibrahim",
        status: "cancelled" as OrderStatus,
      },
    ],
  },
  {
    key: "serge",
    name: "Serge",
    delivered: 6,
    progress: 0,
    cancelled: 0,
    postponed: 0,
    collected: 61000,
    fees: 6000,
    remitted: 55000,
    due: 0,
    orders: [
      {
        client: "Bintou C.",
        phone: "05 88 •• •• 74",
        channel: "tiktok" as Channel,
        products: "Coffret parfum × 1",
        amount: 25000,
        driver: "Serge",
        status: "delivered" as OrderStatus,
      },
    ],
  },
];
export const deliveryTotals = SHOWCASE_DRIVERS.reduce(
  (t, d) => ({
    collected: t.collected + d.collected,
    fees: t.fees + d.fees,
    expected: t.expected + d.collected - d.fees,
    remitted: t.remitted + d.remitted,
    due: t.due + d.due,
  }),
  { collected: 0, fees: 0, expected: 0, remitted: 0, due: 0 },
);
export const SHOWCASE_TABS = [
  {
    key: "dashboard",
    label: "Tableau de bord",
    path: "/dashboard",
    caption:
      "Votre chiffre d’affaires, votre bénéfice estimé et votre objectif du mois, mis à jour à chaque commande livrée.",
  },
  {
    key: "orders",
    label: "Commandes",
    path: "/orders",
    caption:
      "Toutes vos commandes, quel que soit le canal, avec leur statut et leur livreur. Touchez un statut pour filtrer.",
  },
  {
    key: "deliveries",
    label: "Livraisons",
    path: "/deliveries",
    caption:
      "Le bilan du jour par livreur : livrés, en cours, encaissé, frais retenus, reversé et reste dû. Touchez un nom pour voir sa tournée.",
  },
] as const;
export type ShowcaseTab = (typeof SHOWCASE_TABS)[number]["key"];
