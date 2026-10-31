import {
  STATUS_LABELS,
  STATUS_COLORS,
  CHANNEL_LABELS,
  type OrderStatus,
} from "@/lib/constants";
import { formatAmount } from "@/lib/utils";
import { SHOWCASE_ORDERS } from "./showcase-data";
import s from "./landing.module.css";
const filters = [
  "all",
  "received",
  "confirmed",
  "in_progress",
  "delivered",
  "postponed",
] as const;
export type OrderFilter = (typeof filters)[number];
export function ShowcaseOrders({
  filter,
  onFilter,
}: {
  filter: OrderFilter;
  onFilter: (filter: OrderFilter) => void;
}) {
  const orders = SHOWCASE_ORDERS.filter(
    (o) => filter === "all" || o.status === filter,
  );
  return (
    <div data-testid="showcase-screen-orders" className={`${s.fade} space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold">Commandes</h3>
          <p className="mt-1 text-xs text-gray-500">
            Toutes vos commandes, au même endroit.
          </p>
        </div>
        <span className="rounded-xl bg-[#4f46e5] px-3 py-2 text-xs font-semibold text-white">
          + Nouvelle commande
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            type="button"
            key={f}
            data-testid={`showcase-filter-${f}`}
            aria-pressed={filter === f}
            onClick={() => onFilter(f)}
            className={`min-h-11 rounded-full border px-3 text-xs font-semibold ${filter === f ? "border-[#4f46e5] bg-[#4f46e5] text-white" : "border-gray-200 bg-white text-gray-700"}`}
          >
            {f === "all" ? "Toutes" : STATUS_LABELS[f as OrderStatus]}
          </button>
        ))}
      </div>
      <div
        data-testid="showcase-order-list"
        className="grid gap-3 md:grid-cols-2"
      >
        {orders.map((o) => (
          <article
            key={o.client}
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-sm font-semibold">{o.client}</p>
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-semibold ${STATUS_COLORS[o.status]}`}
              >
                {STATUS_LABELS[o.status]}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-gray-500">
              {o.phone} · {CHANNEL_LABELS[o.channel]}
            </p>
            <p className="mt-4 text-xs text-gray-700">{o.products}</p>
            <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-gray-100 pt-3 text-xs">
              <span className="text-gray-500">{o.driver}</span>
              <b className="text-[#4338ca]">{formatAmount(o.amount)} FCFA</b>
            </div>
          </article>
        ))}
      </div>
      {!orders.length && (
        <p className="py-8 text-center text-sm text-gray-500">
          Aucune commande pour ce statut.
        </p>
      )}
    </div>
  );
}
