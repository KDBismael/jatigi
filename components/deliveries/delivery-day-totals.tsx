import { formatCurrency } from "@/lib/utils";
import { DELIVERY_DAY_STATUSES } from "./delivery-day-card";
import type { DeliveryDayStatus } from "@/types/delivery-balance";
export function DeliveryDayTotals({
  totals,
}: {
  totals: Record<DeliveryDayStatus, number> & { expectedRemittance: number };
}) {
  return (
    <section
      aria-label="Total de la journée"
      className="rounded-xl border border-indigo-100 bg-indigo-50 p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">
          Total de la journée
        </h3>
        <p className="text-lg font-bold text-indigo-800">
          {formatCurrency(totals.expectedRemittance)}
        </p>
      </div>
      <p className="mt-1 text-xs text-gray-600">
        À remettre attendu, hors frais de livraison
      </p>
      <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
        {DELIVERY_DAY_STATUSES.map(({ key, label }) => (
          <div key={key} className="rounded-lg bg-white px-1 py-2">
            <dd className="text-lg font-bold text-gray-900">{totals[key]}</dd>
            <dt className="text-[11px] text-gray-500">{label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
